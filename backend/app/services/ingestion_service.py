"""Source polling and article persistence for FEAT-ING-01 (FR-003)."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
import hashlib
import json
from typing import Any
from urllib.parse import urljoin
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ElementTree

from bs4 import BeautifulSoup
from pymongo.errors import DuplicateKeyError

from app.config import Settings, settings
from app.models.domain import Article, Source, SourceType, utc_now
from app.repositories import ArticleRepository, SourceRepository


@dataclass(frozen=True, slots=True)
class CollectedArticle:
    """A normalized source item before it becomes an Article document."""

    title: str
    url: str
    raw_text: str
    published_at: datetime


@dataclass(slots=True)
class SourceCollectionResult:
    """Candidate articles and non-fatal errors from one configured source."""

    articles: list[CollectedArticle]
    errors: list[str]


class IngestionService:
    """Collect RSS, API, and configured scrape sources without stopping on one failure."""

    def __init__(
        self,
        *,
        source_repository: SourceRepository | None = None,
        article_repository: ArticleRepository | None = None,
        app_settings: Settings = settings,
    ) -> None:
        self._source_repository = source_repository or SourceRepository()
        self._article_repository = article_repository or ArticleRepository()
        self._settings = app_settings

    async def collect_articles(self) -> dict[str, Any]:
        """Implement FEAT-ING-01: poll active sources and de-duplicate by URL hash."""

        sources = await self._source_repository.list_active()
        source_results = await asyncio.gather(
            *(self._collect_from_source(source) for source in sources),
            return_exceptions=True,
        )
        new_articles = 0
        skipped_dupes = 0
        source_errors: list[str] = []
        observed_hashes: set[str] = set()

        for source, result in zip(sources, source_results, strict=True):
            if isinstance(result, Exception):
                source_errors.append(f"{source.name}: {result}")
                continue
            source_errors.extend(result.errors)
            for candidate in result.articles:
                url_hash = self._url_hash(candidate.url)
                if url_hash in observed_hashes or await self._article_repository.find_by_url_hash(url_hash):
                    skipped_dupes += 1
                    observed_hashes.add(url_hash)
                    continue
                observed_hashes.add(url_hash)
                if source.id is None:
                    source_errors.append(f"{source.name}: configured source has no identifier")
                    continue
                try:
                    await self._article_repository.create(
                        Article(
                            source_id=source.id,
                            url=candidate.url,
                            url_hash=url_hash,
                            title=candidate.title,
                            raw_text=candidate.raw_text,
                            published_at=candidate.published_at,
                        )
                    )
                    new_articles += 1
                except DuplicateKeyError:
                    skipped_dupes += 1

        return {
            "phase": "collect",
            "status": "done",
            "new": new_articles,
            "skipped_dupes": skipped_dupes,
            "source_errors": source_errors,
            "errors": source_errors,
        }

    async def _collect_from_source(self, source: Source) -> SourceCollectionResult:
        """Poll one source while retaining a source-specific error boundary."""

        try:
            if source.type is SourceType.RSS:
                return await self._collect_rss(source)
            if source.type is SourceType.API:
                return await self._collect_api(source)
            if source.type is SourceType.SCRAPE:
                return await self._collect_scrape(source)
            return SourceCollectionResult([], [f"{source.name}: unsupported source type"])
        except Exception as error:
            return SourceCollectionResult([], [f"{source.name}: {error}"])

    async def _collect_rss(self, source: Source) -> SourceCollectionResult:
        payload, fetched_at = await self._fetch(source.url)
        root = ElementTree.fromstring(payload)
        items = [element for element in root.iter() if self._local_name(element.tag) in {"item", "entry"}]
        articles: list[CollectedArticle] = []
        errors: list[str] = []
        for item in items:
            try:
                title = self._xml_text(item, {"title"})
                url = self._rss_link(item)
                raw_text = self._xml_text(item, {"description", "encoded", "content", "summary"})
                published_value = self._xml_text(item, {"pubdate", "published", "updated"})
                articles.append(self._candidate(title, url, raw_text, published_value, fetched_at))
            except ValueError as error:
                errors.append(f"{source.name}: RSS item skipped: {error}")
        return SourceCollectionResult(articles, errors)

    async def _collect_api(self, source: Source) -> SourceCollectionResult:
        payload, fetched_at = await self._fetch(source.url)
        data = json.loads(payload)
        mapping = source.field_mapping or {}
        root_key = mapping.get("root")

        if isinstance(data, dict):
            if root_key and root_key in data and isinstance(data[root_key], list):
                items = data[root_key]
            else:
                for candidate in ("results", "articles", "data", "items", "headlines"):
                    if candidate in data and isinstance(data[candidate], list):
                        items = data[candidate]
                        break
                else:
                    raise ValueError(f"API response object has no article list under '{root_key or 'articles/results'}'")
        elif isinstance(data, list):
            items = data
        else:
            raise ValueError("API response must be a JSON array or object containing an article list")
        # If items have date/published_at, sort descending to ingest latest news first
        date_key = mapping.get("published_at", "date")
        if any(isinstance(it, dict) and date_key in it for it in items):
            items = sorted(
                [it for it in items if isinstance(it, dict)],
                key=lambda it: str(it.get(date_key) or ""),
                reverse=True,
            )
            # Limit API items to the latest 50 headlines to avoid fetching stale backlogs
            items = items[:50]

        articles: list[CollectedArticle] = []
        errors: list[str] = []
        for item in items:
            if not isinstance(item, dict):
                errors.append(f"{source.name}: API item skipped because it is not an object")
                continue
            try:
                title_val = self._item_value(item, mapping, "title")
                content_val = self._item_value(item, mapping, "content", required=False) or title_val
                articles.append(
                    self._candidate(
                        title_val,
                        self._item_value(item, mapping, "url"),
                        content_val,
                        self._item_value(item, mapping, "published_at", required=False),
                        fetched_at,
                    )
                )
            except ValueError as error:
                errors.append(f"{source.name}: API item skipped: {error}")
        return SourceCollectionResult(articles, errors)

    async def _collect_scrape(self, source: Source) -> SourceCollectionResult:
        if not source.link_selector or not source.content_selector:
            raise ValueError("scrape sources require link_selector and content_selector")
        listing_html, _ = await self._fetch(source.url)
        listing = BeautifulSoup(listing_html, "html.parser")
        links = [link for link in listing.select(source.link_selector) if link.name == "a" and link.get("href")]
        tasks = [self._collect_scraped_article(source, link.get_text(" ", strip=True), urljoin(source.url, link["href"])) for link in links]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        articles: list[CollectedArticle] = []
        errors: list[str] = []
        for result in results:
            if isinstance(result, Exception):
                errors.append(f"{source.name}: scrape article skipped: {result}")
            else:
                articles.append(result)
        return SourceCollectionResult(articles, errors)

    async def _collect_scraped_article(self, source: Source, link_title: str, article_url: str) -> CollectedArticle:
        html, fetched_at = await self._fetch(article_url)
        document = BeautifulSoup(html, "html.parser")
        content = document.select_one(source.content_selector or "")
        if content is None:
            raise ValueError("content_selector did not match an article body")
        title = link_title or self._document_title(document)
        published_value = self._published_meta(document)
        return self._candidate(title, article_url, str(content), published_value, fetched_at)

    async def _fetch(self, url: str) -> tuple[str, datetime]:
        """Fetch a source document outside the event loop."""

        def fetch() -> tuple[str, datetime]:
            request = Request(url, headers={"User-Agent": "OSINT-EIP/1.0"})
            with urlopen(request, timeout=self._settings.source_request_timeout_seconds) as response:  # nosec B310 - source URL is user configuration
                charset = response.headers.get_content_charset() or "utf-8"
                return response.read().decode(charset, errors="replace"), utc_now()

        return await asyncio.to_thread(fetch)

    @staticmethod
    def _candidate(
        title: Any,
        url: Any,
        raw_text: Any,
        published_value: Any,
        fallback_published_at: datetime,
    ) -> CollectedArticle:
        normalized_title = str(title or "").strip()
        normalized_url = str(url or "").strip()
        normalized_text = str(raw_text or "").strip()
        if not normalized_title or not normalized_url or not normalized_text:
            raise ValueError("title, url, and content are required")
        return CollectedArticle(
            title=normalized_title,
            url=normalized_url,
            raw_text=normalized_text,
            published_at=IngestionService._parse_published_at(published_value, fallback_published_at),
        )

    @staticmethod
    def _parse_published_at(value: Any, fallback: datetime) -> datetime:
        if value is None or str(value).strip() == "":
            return fallback
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value, tz=UTC)
        text = str(value).strip()
        try:
            if text.replace(".", "", 1).isdigit():
                return datetime.fromtimestamp(float(text), tz=UTC)
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            try:
                parsed = parsedate_to_datetime(text)
            except (TypeError, ValueError):
                return fallback
        return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)

    @staticmethod
    def _item_value(item: dict[str, Any], mapping: dict[str, str], canonical_name: str, *, required: bool = True) -> Any:
        field_name = mapping.get(canonical_name, canonical_name)
        value = item.get(field_name)
        if required and value is None:
            raise ValueError(f"missing {canonical_name} field")
        return value

    @staticmethod
    def _url_hash(url: str) -> str:
        return hashlib.sha256(url.encode("utf-8")).hexdigest()

    @staticmethod
    def _local_name(tag: str) -> str:
        return tag.rsplit("}", 1)[-1].lower()

    @classmethod
    def _xml_text(cls, element: ElementTree.Element, names: set[str]) -> str | None:
        for child in element.iter():
            if child is element or cls._local_name(child.tag) not in names:
                continue
            if child.text and child.text.strip():
                return child.text.strip()
        return None

    @classmethod
    def _rss_link(cls, item: ElementTree.Element) -> str | None:
        for child in item:
            if cls._local_name(child.tag) != "link":
                continue
            return child.get("href") or (child.text.strip() if child.text else None)
        return None

    @staticmethod
    def _document_title(document: BeautifulSoup) -> str:
        heading = document.find("h1")
        if heading:
            return heading.get_text(" ", strip=True)
        if document.title:
            return document.title.get_text(" ", strip=True)
        return ""

    @staticmethod
    def _published_meta(document: BeautifulSoup) -> str | None:
        time_tag = document.find("time")
        if time_tag:
            return time_tag.get("datetime") or time_tag.get_text(" ", strip=True)
        meta = document.find("meta", attrs={"property": "article:published_time"})
        meta = meta or document.find("meta", attrs={"name": "article:published_time"})
        return meta.get("content") if meta else None
