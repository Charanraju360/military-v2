"""Hybrid event clustering for the redesigned backend architecture."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import logging
import math
import re
from typing import Any

import numpy as np

from app.config import settings
from app.models.domain import Article, ArticleStatus, Event, EventArticle, EventStatus
from app.repositories.article_repository import ArticleRepository
from app.repositories.chroma_repository import ChromaRepository
from app.repositories.entity_repository import EntityRepository
from app.repositories.event_article_repository import EventArticleRepository
from app.repositories.event_repository import EventRepository

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class HybridSignals:
    semantic: float
    entity: float
    location: float
    time: float
    metadata: float

    def weighted(self) -> float:
        return (
            (self.semantic * settings.hybrid_semantic_weight)
            + (self.entity * settings.hybrid_entity_weight)
            + (self.location * settings.hybrid_location_weight)
            + (self.time * settings.hybrid_time_weight)
            + (self.metadata * settings.hybrid_metadata_weight)
        )

    def as_dict(self) -> dict[str, float]:
        return {
            "semantic": round(self.semantic, 4),
            "entity": round(self.entity, 4),
            "location": round(self.location, 4),
            "time": round(self.time, 4),
            "metadata": round(self.metadata, 4),
            "weighted": round(self.weighted(), 4),
        }


class ClusteringService:
    """Cluster processed articles into events using hybrid structured signals."""

    def __init__(
        self,
        article_repository: ArticleRepository | None = None,
        event_repository: EventRepository | None = None,
        event_article_repository: EventArticleRepository | None = None,
        entity_repository: EntityRepository | None = None,
        chroma_repository: ChromaRepository | None = None,
    ) -> None:
        self._article_repository = article_repository or ArticleRepository()
        self._event_repository = event_repository or EventRepository()
        self._event_article_repository = event_article_repository or EventArticleRepository()
        self._entity_repository = entity_repository or EntityRepository()
        self._chroma_repository = chroma_repository or ChromaRepository()

    def cluster_articles(
        self,
        *,
        articles: list[Article],
        vectors_by_id: dict[str, list[float]],
        entities_by_article: dict[str, list[dict[str, Any]]],
    ) -> tuple[list[list[str]], dict[str, Any]]:
        """Build event clusters from hybrid semantic/entity/time/location/metadata relatedness."""

        article_ids = [article.id for article in articles if article.id and article.id in vectors_by_id]
        if not article_ids:
            return [], {"method": "hybrid_graph", "edges": []}
        if len(article_ids) == 1:
            return [[article_ids[0]]], {"method": "hybrid_graph", "edges": []}

        article_by_id = {article.id: article for article in articles if article.id}
        parent = {article_id: article_id for article_id in article_ids}
        edges: list[dict[str, Any]] = []

        def find(item: str) -> str:
            while parent[item] != item:
                parent[item] = parent[parent[item]]
                item = parent[item]
            return item

        def union(left: str, right: str) -> None:
            root_left = find(left)
            root_right = find(right)
            if root_left != root_right:
                parent[root_right] = root_left

        for index, left_id in enumerate(article_ids):
            for right_id in article_ids[index + 1 :]:
                left = article_by_id[left_id]
                right = article_by_id[right_id]
                signals = self._hybrid_signals(
                    left=left,
                    right=right,
                    left_vector=vectors_by_id[left_id],
                    right_vector=vectors_by_id[right_id],
                    left_entities=entities_by_article.get(left_id, []),
                    right_entities=entities_by_article.get(right_id, []),
                )
                score = signals.weighted()
                if score >= settings.hybrid_match_threshold:
                    union(left_id, right_id)
                    edges.append({"left": left_id, "right": right_id, "signals": signals.as_dict()})

        grouped: dict[str, list[str]] = {}
        for article_id in article_ids:
            grouped.setdefault(find(article_id), []).append(article_id)

        metadata = {
            "method": "hybrid_graph",
            "signals": ["semantic", "entity", "location", "time", "metadata"],
            "weights": {
                "semantic": settings.hybrid_semantic_weight,
                "entity": settings.hybrid_entity_weight,
                "location": settings.hybrid_location_weight,
                "time": settings.hybrid_time_weight,
                "metadata": settings.hybrid_metadata_weight,
            },
            "threshold": settings.hybrid_match_threshold,
            "edges": edges[:100],
        }
        return list(grouped.values()), metadata

    async def cluster_processed_articles(self, *, batch_size: int = 500) -> dict[str, Any]:
        """Fetch processed articles, run hybrid clustering, and persist event records."""

        events_created = 0
        singleton_events = 0
        errors: list[str] = []

        try:
            processed_articles = await self._article_repository.list_by_status(
                ArticleStatus.PROCESSED, batch_size=batch_size
            )
            if not processed_articles:
                return self._status(events_created, singleton_events, errors)

            valid_articles = [article for article in processed_articles if article.id]
            valid_ids = [article.id for article in valid_articles if article.id]
            article_by_id = {article.id: article for article in valid_articles if article.id}

            chroma_data = await self._chroma_repository.get("article_embeddings", ids=valid_ids)
            chroma_ids = list(chroma_data.get("ids") or [])
            raw_embeddings = chroma_data.get("embeddings")
            if raw_embeddings is not None and len(raw_embeddings) > 0:
                chroma_vectors = [list(vec) for vec in raw_embeddings]
            else:
                chroma_vectors = []
            vectors_by_id = {str(cid): vec for cid, vec in zip(chroma_ids, chroma_vectors)}
            if len(vectors_by_id) == 0:
                return self._status(
                    events_created, singleton_events, ["No vectors retrieved from article_embeddings"]
                )


            entity_rows = await self._entity_repository.list_for_articles(valid_ids)
            entities_by_article: dict[str, list[dict[str, Any]]] = {}
            for entity in entity_rows:
                entities_by_article.setdefault(entity.article_id, []).append(
                    {"text": entity.text, "type": entity.type, "mention_count": entity.mention_count}
                )

            clusters, cluster_metadata = self.cluster_articles(
                articles=valid_articles,
                vectors_by_id=vectors_by_id,
                entities_by_article=entities_by_article,
            )

            for cluster_ids in clusters:
                try:
                    member_articles = [article_by_id[aid] for aid in cluster_ids if aid in article_by_id]
                    if not member_articles:
                        continue

                    dates = [article.published_at for article in member_articles if article.published_at]
                    first_at = min(dates) if dates else datetime.now(UTC)
                    latest_at = max(dates) if dates else datetime.now(UTC)
                    centroid_vector = self._centroid(
                        [vectors_by_id[aid] for aid in cluster_ids if aid in vectors_by_id]
                    )
                    member_locations = sorted(
                        {
                            item["text"]
                            for aid in cluster_ids
                            for item in entities_by_article.get(aid, [])
                            if item["type"] == "LOCATION"
                        }
                    )

                    event = Event(
                        article_count=len(cluster_ids),
                        status=EventStatus.CLUSTERED,
                        first_article_at=first_at,
                        latest_article_at=latest_at,
                        locations=member_locations,
                        hybrid_cluster_metadata=cluster_metadata,
                    )
                    created_event = await self._event_repository.create(event)
                    if not created_event or not created_event.id:
                        continue

                    await self._chroma_repository.upsert(
                        name="event_embeddings",
                        ids=[created_event.id],
                        embeddings=[centroid_vector],
                        metadatas=[{"event_id": created_event.id}],
                    )
                    await self._event_repository.update(
                        created_event.id, {"centroid_embedding_id": created_event.id}
                    )

                    for article_id in cluster_ids:
                        await self._event_article_repository.create(
                            EventArticle(event_id=created_event.id, article_id=article_id)
                        )

                    events_created += 1
                    if len(cluster_ids) == 1:
                        singleton_events += 1

                except Exception as cluster_err:
                    logger.exception("Error persisting cluster")
                    errors.append(f"Cluster persistence error: {cluster_err}")

        except Exception as error:
            logger.exception("Error during clustering phase execution")
            errors.append(str(error))

        return self._status(events_created, singleton_events, errors)

    def _normalize_entity_text(self, text: str) -> str:
        t = re.sub(r"[\r\n\t]+", " ", text).strip().lower()
        t = re.sub(r"^(the|a|an)\s+", "", t)
        t = t.strip(".'\",-")
        aliases = {
            "u.s.": "us",
            "u.s": "us",
            "usa": "us",
            "united states": "us",
            "united states of america": "us",
            "uk": "uk",
            "u.k.": "uk",
            "united kingdom": "uk",
            "britain": "uk",
            "great britain": "uk",
            "russia": "russia",
            "russian federation": "russia",
            "ukraine": "ukraine",
            "china": "china",
            "prc": "china",
            "peoples republic of china": "china",
            "rtx": "raytheon",
            "rtx raytheon": "raytheon",
            "raytheon technologies": "raytheon",
            "the pentagon": "pentagon",
            "u.s. air force": "us air force",
            "u.s air force": "us air force",
            "air force": "us air force",
            "u.s. navy": "us navy",
            "u.s navy": "us navy",
            "navy": "us navy",
            "u.s. army": "us army",
            "u.s army": "us army",
            "army": "us army",
            "u.s. marine corps": "marines",
            "usmc": "marines",
            "u.s. space force": "space force",
            "us space force": "space force",
            "f-15ex": "boeing_aircraft",
            "mh-139a grey wolf": "boeing_aircraft",
            "grey wolf": "boeing_aircraft",
            "f/a-xx": "boeing_aircraft",
            "a-xx": "boeing_aircraft",
            "sm-6": "raytheon_missile",
            "amraam": "raytheon_missile",
            "amraams": "raytheon_missile",
        }
        return aliases.get(t, t)

    def _hybrid_signals(
        self,
        *,
        left: Article,
        right: Article,
        left_vector: list[float],
        right_vector: list[float],
        left_entities: list[dict[str, Any]],
        right_entities: list[dict[str, Any]],
    ) -> HybridSignals:
        left_entity_set = {
            self._normalize_entity_text(item["text"]) for item in left_entities if item.get("text")
        }
        right_entity_set = {
            self._normalize_entity_text(item["text"]) for item in right_entities if item.get("text")
        }
        left_location_set = {
            self._normalize_entity_text(item["text"])
            for item in left_entities
            if item.get("type") == "LOCATION" and item.get("text")
        }
        right_location_set = {
            self._normalize_entity_text(item["text"])
            for item in right_entities
            if item.get("type") == "LOCATION" and item.get("text")
        }

        semantic = self._cosine_similarity(left_vector, right_vector)
        entity = self._jaccard(left_entity_set, right_entity_set)
        location = self._jaccard(left_location_set, right_location_set)
        time = self._time_score(left.published_at, right.published_at)
        metadata = 1.0 if left.category_hint and left.category_hint == right.category_hint else 0.0
        return HybridSignals(semantic, entity, location, time, metadata)

    def _cosine_similarity(self, left: list[float], right: list[float]) -> float:
        left_arr = np.array(left, dtype=np.float32)
        right_arr = np.array(right, dtype=np.float32)
        denom = float(np.linalg.norm(left_arr) * np.linalg.norm(right_arr))
        if denom == 0.0:
            return 0.0
        return max(0.0, min(1.0, float(np.dot(left_arr, right_arr) / denom)))

    def _jaccard(self, left: set[str], right: set[str]) -> float:
        if not left and not right:
            return 0.0
        union = left | right
        return len(left & right) / len(union) if union else 0.0

    def _time_score(self, left: datetime, right: datetime) -> float:
        delta_days = abs((left - right).total_seconds()) / 86400.0
        return math.exp(-delta_days / 7.0)

    def _centroid(self, vectors: list[list[float]]) -> list[float]:
        if not vectors:
            return [0.0] * 384
        return np.mean(np.array(vectors, dtype=np.float32), axis=0).tolist()

    def _status(
        self, events_created: int, singleton_events: int, errors: list[str]
    ) -> dict[str, Any]:
        return {
            "phase": "cluster",
            "status": "done" if not errors else "done_with_errors",
            "events_created": events_created,
            "singleton_events": singleton_events,
            "hybrid_signals": ["semantic", "entity", "location", "time", "metadata"],
            "errors": errors,
        }
