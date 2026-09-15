"""Collective summarization service implementing FEAT-PROC-04 (Phase 7)."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
import logging
from typing import Any

from app.clients.omniroute_client import OmnirouteClient
from app.clients.textrank_fallback import TextRankFallback
from app.models.domain import Category, EventStatus, SummarySource
from app.repositories.article_repository import ArticleRepository
from app.repositories.event_article_repository import EventArticleRepository
from app.repositories.event_repository import EventRepository
from app.repositories.source_repository import SourceRepository

logger = logging.getLogger(__name__)


class SummarizationService:
    """Generate collective event summaries using Omniroute with local TextRank fallback."""

    def __init__(
        self,
        event_repository: EventRepository | None = None,
        event_article_repository: EventArticleRepository | None = None,
        article_repository: ArticleRepository | None = None,
        source_repository: SourceRepository | None = None,
        omniroute_client: OmnirouteClient | None = None,
        textrank_fallback: TextRankFallback | None = None,
    ) -> None:
        self._event_repository = event_repository or EventRepository()
        self._event_article_repository = event_article_repository or EventArticleRepository()
        self._article_repository = article_repository or ArticleRepository()
        self._source_repository = source_repository or SourceRepository()
        self._omniroute_client = omniroute_client or OmnirouteClient()
        self._textrank_fallback = textrank_fallback or TextRankFallback()

    async def summarize_events(self, *, batch_size: int = 100) -> dict[str, Any]:
        """Summarize all clustered events using combined member article content."""

        summarized = 0
        fallback_used = 0
        failed = 0
        errors: list[str] = []

        try:
            clustered_events = await self._event_repository.list(
                {"status": EventStatus.CLUSTERED.value}, page_size=batch_size
            )

            for event in clustered_events:
                if not event.id:
                    continue

                try:
                    # 1. Fetch all member article mappings for this event
                    event_articles = await self._event_article_repository.find_for_event(event.id)
                    article_ids = [ea.article_id for ea in event_articles]

                    if not article_ids:
                        logger.warning("Event %s has no member articles; marking failed", event.id)
                        failed += 1
                        continue

                    # 2. Fetch member Article documents
                    articles = await self._article_repository.list_by_ids(article_ids)
                    if not articles:
                        failed += 1
                        continue

                    # Sort articles newest-first by published_at
                    articles.sort(key=lambda a: a.published_at, reverse=True)

                    # 3. Concatenate cleaned text from ALL member articles combined
                    text_blocks: list[str] = []
                    for art in articles:
                        text_blocks.append(f"Title: {art.title}\n{art.cleaned_text or ''}")

                    combined_text = "\n\n".join(text_blocks)

                    # 4. Compute credibility score = average(source trust_rating)
                    source_ids = {a.source_id for a in articles if a.source_id}
                    trust_ratings: list[int] = []

                    for sid in source_ids:
                        source = await self._source_repository.get(sid)
                        if source and source.trust_rating is not None:
                            trust_ratings.append(source.trust_rating)

                    if trust_ratings:
                        credibility_score = float(sum(trust_ratings) / len(trust_ratings))
                    else:
                        credibility_score = 50.0

                    # 5. Determine majority category_hint among member articles
                    categories = [a.category_hint for a in articles if a.category_hint]
                    if categories:
                        majority_category = Counter(categories).most_common(1)[0][0]
                    else:
                        majority_category = Category.OTHER_MILITARY

                    # 6. Primary summarization: Omniroute LLM call (6-8s timeout)
                    summary_text, omni_category = await self._omniroute_client.summarize_event(
                        combined_text=combined_text, timeout=7.0
                    )

                    if summary_text and summary_text.strip():
                        final_summary = summary_text.strip()
                        final_source = SummarySource.OMNIROUTE
                        final_category = omni_category or majority_category
                    else:
                        # 7. Fallback summarization: local Sumy TextRank
                        logger.warning(
                            "Omniroute summarization failed/timed out for event %s; falling back to local TextRank",
                            event.id,
                        )
                        final_summary = self._textrank_fallback.summarize(
                            combined_text, max_words=120
                        )
                        final_source = SummarySource.TEXTRANK_FALLBACK
                        final_category = majority_category
                        fallback_used += 1

                    # 8. Update Event record in MongoDB
                    await self._event_repository.update(
                        event.id,
                        {
                            "summary": final_summary,
                            "summary_source": final_source.value,
                            "category": final_category.value,
                            "credibility_score": credibility_score,
                            "status": EventStatus.SUMMARIZED.value,
                            "updated_at": datetime.now(UTC),
                        },
                    )
                    summarized += 1

                except Exception as event_err:
                    logger.exception("Error summarizing event %s", event.id)
                    failed += 1
                    errors.append(f"Event {event.id}: {event_err}")

        except Exception as error:
            logger.exception("Error during summarization phase execution")
            errors.append(str(error))

        return {
            "phase": "summarize",
            "status": "done" if not errors else "done_with_errors",
            "summarized": summarized,
            "fallback_used": fallback_used,
            "failed": failed,
            "errors": errors,
        }
