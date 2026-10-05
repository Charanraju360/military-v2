"""Military topic-filter service implementing FEAT-PROC-01b (Phase 4)."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.clients.llm_client import LLMClient
from app.models.domain import Article, ArticleStatus, Category
from app.repositories.article_repository import ArticleRepository

logger = logging.getLogger(__name__)

# Maintainable keyword allowlist per category (docs/12-coding-standards.md)
# Priority order: specific categories first, general military category last.
KEYWORD_CATEGORY_RULES: list[tuple[Category, list[str]]] = [
    (
        Category.DRILL,
        ["drill", "drills", "exercise", "exercises", "maneuver", "maneuvers", "war game", "war games"],
    ),
    (
        Category.PEACE_DEAL,
        ["ceasefire", "treaty", "armistice", "peace deal", "peace agreement", "peace talk", "truce"],
    ),
    (
        Category.ATTACK,
        [
            "strike",
            "strikes",
            "attack",
            "attacks",
            "bombing",
            "bombings",
            "missile",
            "missiles",
            "air raid",
            "air-raid",
            "artillery",
            "shelling",
            "clash",
            "clashes",
            "combat",
            "casualty",
            "casualties",
            "airstrike",
            "airstrikes",
            "ambush",
            "gunfire",
            "explosion",
            "bombardment",
            "invasion",
        ],
    ),
    (
        Category.GEOPOLITICS,
        [
            "nato",
            "summit",
            "alliance",
            "sanction",
            "sanctions",
            "diplomacy",
            "embargo",
            "geopolitics",
            "foreign policy",
        ],
    ),
    (
        Category.AGREEMENT,
        [
            "agreement",
            "pact",
            "accord",
            "security pact",
            "defense pact",
            "memorandum",
        ],
    ),
    (
        Category.OTHER_MILITARY,
        [
            "military",
            "navy",
            "army",
            "air force",
            "defense",
            "defence",
            "pentagon",
            "kremlin",
            "armed forces",
            "weapon",
            "weapons",
            "drone",
            "drones",
            "submarine",
            "warship",
            "infantry",
            "tank",
            "tanks",
            "battalion",
            "brigade",
            "regiment",
            "soldier",
            "soldiers",
            "trooper",
            "warfare",
            "marines",
            "fighter jet",
            "aircraft carrier",
        ],
    ),
]


class TopicFilterService:
    """Filter cleaned articles into military categories or reject as off-topic."""

    def __init__(
        self,
        article_repository: ArticleRepository | None = None,
        llm_client: LLMClient | None = None,
    ) -> None:
        self._article_repository = article_repository or ArticleRepository()
        self._llm_client = llm_client or LLMClient()

    def check_keywords(self, title: str, cleaned_text: str | None) -> Category | None:
        """Check title + first ~500 chars against the keyword allowlist.

        Returns matching Category enum if found, or None if ambiguous.
        """
        combined = f"{title} {cleaned_text[:500] if cleaned_text else ''}".lower()

        for category, keywords in KEYWORD_CATEGORY_RULES:
            for kw in keywords:
                if kw in combined:
                    return category

        return None

    async def filter_articles(self, *, batch_size: int = 100) -> dict[str, Any]:
        """Process all cleaned articles and apply FEAT-PROC-01b topic filtering rules."""

        filtered_ok = 0
        rejected_offtopic = 0
        errors: list[str] = []

        try:
            cleaned_articles = await self._article_repository.list_by_status(
                ArticleStatus.CLEANED, batch_size=batch_size
            )

            while cleaned_articles:
                ambiguous_articles = []
                for article in cleaned_articles:
                    if not article.id:
                        continue

                    # Step 1 & 2: Check keyword allowlist (fast in-memory)
                    matched_category = self.check_keywords(
                        article.title, article.cleaned_text
                    )

                    if matched_category is not None:
                        await self._article_repository.update(
                            article.id,
                            {
                                "status": ArticleStatus.FILTERED_OK.value,
                                "category_hint": matched_category.value,
                            },
                        )
                        filtered_ok += 1
                    else:
                        ambiguous_articles.append(article)

                # Step 3 & 4: Process ambiguous articles concurrently with short timeout
                if ambiguous_articles:
                    sem = asyncio.Semaphore(4)

                    async def classify_and_update(art: Article) -> None:
                        nonlocal filtered_ok, rejected_offtopic
                        async with sem:
                            try:
                                is_military, llm_category = await self._llm_client.classify_topic(
                                    title=art.title,
                                    text=art.cleaned_text or "",
                                    timeout=8.0,
                                )

                                if is_military and llm_category is not None:
                                    await self._article_repository.update(
                                        art.id,
                                        {
                                            "status": ArticleStatus.FILTERED_OK.value,
                                            "category_hint": llm_category.value,
                                        },
                                    )
                                    filtered_ok += 1
                                else:
                                    # Default reject as off-topic per FR-005 / NFR-020
                                    await self._article_repository.update(
                                        art.id,
                                        {
                                            "status": ArticleStatus.REJECTED.value,
                                            "rejection_reason": "off_topic",
                                        },
                                    )
                                    rejected_offtopic += 1
                            except Exception as error:
                                logger.exception("Error filtering ambiguous article %s", art.id)
                                errors.append(f"Article {art.id}: {error}")

                    await asyncio.gather(*(classify_and_update(art) for art in ambiguous_articles))

                cleaned_articles = await self._article_repository.list_by_status(
                    ArticleStatus.CLEANED, batch_size=batch_size
                )


        except Exception as error:
            logger.exception("Error during topic filter phase execution")
            errors.append(str(error))

        return {
            "phase": "filter",
            "status": "done" if not errors else "done_with_errors",
            "filtered_ok": filtered_ok,
            "rejected_offtopic": rejected_offtopic,
            "errors": errors,
        }
