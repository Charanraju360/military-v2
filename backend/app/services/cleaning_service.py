"""Text cleaning and short-article rejection for FEAT-PROC-01 (FR-004)."""

from __future__ import annotations

from typing import Any

from bs4 import BeautifulSoup

from app.models.domain import Article, ArticleStatus
from app.repositories import ArticleRepository


MINIMUM_CLEANED_TEXT_LENGTH = 100
BOILERPLATE_TAGS = ("aside", "footer", "header", "nav", "script", "style")


class CleaningService:
    """Strip article markup and reject text below the documented length threshold."""

    def __init__(self, *, article_repository: ArticleRepository | None = None) -> None:
        self._article_repository = article_repository or ArticleRepository()

    async def clean_articles(self) -> dict[str, Any]:
        """Implement FEAT-PROC-01 for every currently ingested article."""

        cleaned = 0
        rejected_short = 0
        errors: list[str] = []
        while articles := await self._article_repository.list_by_status(ArticleStatus.INGESTED):
            for article in articles:
                try:
                    cleaned_text = self.clean_text(article.raw_text or "")
                    if len(cleaned_text) < MINIMUM_CLEANED_TEXT_LENGTH:
                        await self._article_repository.update(
                            article.id or "",
                            {
                                "cleaned_text": cleaned_text,
                                "status": ArticleStatus.REJECTED.value,
                                "rejection_reason": "too_short",
                            },
                        )
                        rejected_short += 1
                    else:
                        await self._article_repository.update(
                            article.id or "",
                            {
                                "cleaned_text": cleaned_text,
                                "status": ArticleStatus.CLEANED.value,
                                "rejection_reason": None,
                            },
                        )
                        cleaned += 1
                except Exception as error:
                    errors.append(f"article {article.id}: {error}")
                    if article.id:
                        await self._article_repository.update(article.id, {"status": ArticleStatus.FAILED.value})

        return {
            "phase": "clean",
            "status": "done",
            "cleaned": cleaned,
            "rejected_short": rejected_short,
            "errors": errors,
        }

    @staticmethod
    def clean_text(raw_text: str) -> str:
        """Remove HTML and common page chrome before measuring article content."""

        document = BeautifulSoup(raw_text, "html.parser")
        for element in document.find_all(BOILERPLATE_TAGS):
            element.decompose()
        return " ".join(document.get_text(" ", strip=True).split())
