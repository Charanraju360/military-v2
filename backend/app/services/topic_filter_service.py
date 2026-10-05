"""Military topic-filter service implementing FEAT-PROC-01b (Phase 4)."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.clients.llm_client import LLMClient
from app.models.domain import Article, ArticleStatus, Category
from app.repositories.article_repository import ArticleRepository

logger = logging.getLogger(__name__)

# Fast off-topic reject patterns to avoid expensive LLM calls on obvious humor/entertainment
OFFTOPIC_PATTERNS: list[str] = [
    "florida man",
    "alligator",
    "dui",
    "lottery",
    "walmart",
    "burglary",
    "methamphetamine",
    "meth ",
    "baking contest",
    "gardening",
    "gardening contest",
    "recipe",
    "celebrity",
    "hollywood",
    "box office",
    "nfl",
    "nba",
    "baseball",
    "premier league",
    "super bowl",
    "dating app",
    "wedding",
]

# Maintainable keyword allowlist per category (docs/12-coding-standards.md)
# Priority order: specific categories first, general military category last.
KEYWORD_CATEGORY_RULES: list[tuple[Category, list[str]]] = [
    (
        Category.DRILL,
        [
            "drill", "drills", "exercise", "exercises", "maneuver", "maneuvers",
            "war game", "war games", "wargame", "wargames", "readiness exercise",
            "training exercise", "joint exercise",
        ],
    ),
    (
        Category.PEACE_DEAL,
        [
            "ceasefire", "cease-fire", "treaty", "armistice", "peace deal",
            "peace agreement", "peace talk", "peace talks", "truce", "demilitarized",
        ],
    ),
    (
        Category.ATTACK,
        [
            "strike", "strikes", "attack", "attacks", "assault", "assaults",
            "bombing", "bombings", "bomber", "bombers", "missile", "missiles",
            "air raid", "air-raid", "artillery", "shelling", "clash", "clashes",
            "combat", "casualty", "casualties", "airstrike", "airstrikes",
            "ambush", "gunfire", "explosion", "bombardment", "invasion", "invade",
            "offensive", "counteroffensive", "frontline", "warzone", "war",
            "warfare", "hostilities", "chokehold", "downed", "intercept",
            "interception",
        ],
    ),
    (
        Category.GEOPOLITICS,
        [
            "nato", "summit", "alliance", "sanction", "sanctions", "diplomacy",
            "embargo", "geopolitics", "foreign policy", "coalition", "deterrence",
            "containment", "sovereign", "superpower",
        ],
    ),
    (
        Category.AGREEMENT,
        [
            "agreement", "pact", "accord", "security pact", "defense pact",
            "memorandum", "arms deal", "arms transfer", "defense agreement",
        ],
    ),
    (
        Category.OTHER_MILITARY,
        [
            "military", "navy", "naval", "army", "air force", "defense", "defence",
            "pentagon", "kremlin", "armed forces", "weapon", "weapons", "drone",
            "drones", "uav", "submarine", "warship", "corvette", "frigate", "destroyer",
            "infantry", "tank", "tanks", "battalion", "brigade", "regiment", "squadron",
            "soldier", "soldiers", "troops", "forces", "marines", "fighter jet",
            "aircraft carrier", "air-defense", "air defense", "anti-ship", "anti-air",
            "ammunition", "munitions", "ballistic", "hypersonic", "radar", "surveillance",
            "reconnaissance", "patrol", "base", "bases", "commander", "general",
            "admiral", "houthi", "houthis", "hezbollah", "hamas", "idf", "zelensky", "putin",
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

    def is_obviously_offtopic(self, title: str, cleaned_text: str | None) -> bool:
        """Check for clear non-military / humor keywords to skip expensive LLM calls."""
        combined = f"{title} {(cleaned_text or '')[:500]}".lower()
        return any(pattern in combined for pattern in OFFTOPIC_PATTERNS)

    def check_keywords(self, title: str, cleaned_text: str | None) -> Category | None:
        """Check title + first ~1500 chars against the keyword allowlist.

        Returns matching Category enum if found, or None if ambiguous.
        """
        combined = f"{title} {cleaned_text[:1500] if cleaned_text else ''}".lower()

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

                    # Step 1: Check fast-reject for obvious humor/off-topic content
                    if self.is_obviously_offtopic(article.title, article.cleaned_text):
                        await self._article_repository.update(
                            article.id,
                            {
                                "status": ArticleStatus.REJECTED.value,
                                "rejection_reason": "off_topic",
                            },
                        )
                        rejected_offtopic += 1
                        continue

                    # Step 2: Check keyword allowlist (fast in-memory)
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

                # Step 3 & 4: Process ambiguous articles concurrently with strict 4.0s timeout
                if ambiguous_articles:
                    sem = asyncio.Semaphore(4)

                    async def classify_and_update(art: Article) -> None:
                        nonlocal filtered_ok, rejected_offtopic
                        async with sem:
                            try:
                                is_military, llm_category = await self._llm_client.classify_topic(
                                    title=art.title,
                                    text=art.cleaned_text or "",
                                    timeout=4.0,
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
