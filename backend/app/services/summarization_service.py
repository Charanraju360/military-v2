"""Collective event synthesis service for the redesigned backend."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
import logging
from typing import Any

from app.clients.llm_client import LLMClient
from app.clients.structured_event_fallback import StructuredEventFallback
from app.models.domain import Category, EventStatus, SummarySource
from app.repositories.article_repository import ArticleRepository
from app.repositories.entity_repository import EntityRepository
from app.repositories.event_article_repository import EventArticleRepository
from app.repositories.event_repository import EventRepository
from app.repositories.source_repository import SourceRepository

logger = logging.getLogger(__name__)


class SummarizationService:
    """Generate structured collective event intelligence with multi-level fallback."""

    def __init__(
        self,
        event_repository: EventRepository | None = None,
        event_article_repository: EventArticleRepository | None = None,
        article_repository: ArticleRepository | None = None,
        entity_repository: EntityRepository | None = None,
        source_repository: SourceRepository | None = None,
        llm_client: LLMClient | None = None,
        structured_fallback: StructuredEventFallback | None = None,
    ) -> None:
        self._event_repository = event_repository or EventRepository()
        self._event_article_repository = event_article_repository or EventArticleRepository()
        self._article_repository = article_repository or ArticleRepository()
        self._entity_repository = entity_repository or EntityRepository()
        self._source_repository = source_repository or SourceRepository()
        self._llm_client = llm_client or LLMClient()
        self._structured_fallback = structured_fallback or StructuredEventFallback()

    async def summarize_events(self, *, batch_size: int = 100) -> dict[str, Any]:
        """Summarize all clustered events from an event workspace."""

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
                    event_articles = await self._event_article_repository.find_for_event(event.id)
                    article_ids = [ea.article_id for ea in event_articles]
                    if not article_ids:
                        failed += 1
                        continue

                    articles = await self._article_repository.list_by_ids(article_ids)
                    if not articles:
                        failed += 1
                        continue
                    articles.sort(key=lambda item: item.published_at, reverse=True)

                    source_ids = {article.source_id for article in articles if article.source_id}
                    sources_by_id = {}
                    for source_id in source_ids:
                        source = await self._source_repository.get(source_id)
                        if source:
                            sources_by_id[source_id] = source

                    majority_category = self._majority_category(articles)
                    entities = await self._entity_repository.list_for_articles(article_ids)
                    workspace = self._structured_fallback.build_workspace(
                        event_id=event.id,
                        articles=articles,
                        entities=entities,
                        sources_by_id=sources_by_id,
                    )

                    llm_result, llm_source = await self._llm_client.synthesize_event(
                        workspace
                    )

                    if llm_result and llm_source:
                        final_summary = str(llm_result.get("summary", "")).strip()
                        final_source = llm_source
                        final_category = self._parse_category(
                            llm_result.get("category"), majority_category
                        )
                        raw_claims = self._list_field(llm_result.get("claims")) or workspace["claims"]
                        claims = [
                            c if isinstance(c, dict) else {"claim_id": f"claim:{idx}", "text": str(c), "aspect": "statement", "value": str(c)}
                            for idx, c in enumerate(raw_claims)
                        ]
                        timeline = self._list_field(llm_result.get("timeline")) or workspace["timeline"]
                        conflicts = self._list_field(llm_result.get("conflicts")) or workspace["conflicts"]
                        locations = [
                            str(item)
                            for item in (
                                self._list_field(llm_result.get("locations"))
                                or workspace["locations"]
                            )
                        ]
                        uncertainty_statements = self._list_field(
                            llm_result.get("uncertainty_statements")
                        ) or workspace["uncertainty_statements"]
                        source_refs = workspace["source_refs"]
                    else:
                        logger.warning(
                            "LLM event synthesis failed/timed out for event %s; using structured fallback",
                            event.id,
                        )
                        fallback_result = self._structured_fallback.synthesize(
                            workspace=workspace,
                            articles=articles,
                            majority_category=majority_category,
                        )
                        final_summary = fallback_result["summary"]
                        final_source = SummarySource.STRUCTURED_FALLBACK
                        final_category = fallback_result["category"]
                        claims = fallback_result["claims"]
                        timeline = fallback_result["timeline"]
                        conflicts = fallback_result["conflicts"]
                        locations = fallback_result["locations"]
                        source_refs = fallback_result["source_refs"]
                        uncertainty_statements = fallback_result["uncertainty_statements"]
                        fallback_used += 1

                    await self._event_repository.update(
                        event.id,
                        {
                            "summary": final_summary,
                            "summary_source": final_source.value,
                            "category": final_category.value,
                            "claims": claims,
                            "timeline": timeline,
                            "conflicts": conflicts,
                            "locations": locations,
                            "source_refs": source_refs,
                            "uncertainty_statements": uncertainty_statements,
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

    def _majority_category(self, articles: list[Any]) -> Category:
        categories = [article.category_hint for article in articles if article.category_hint]
        return Counter(categories).most_common(1)[0][0] if categories else Category.OTHER_MILITARY

    def _parse_category(self, value: Any, fallback: Category) -> Category:
        if isinstance(value, str):
            try:
                return Category(value.upper())
            except ValueError:
                return fallback
        return fallback

    def _list_field(self, value: Any) -> list[Any]:
        return value if isinstance(value, list) else []
