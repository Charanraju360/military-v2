"""Embedding-only clustering service implementing FEAT-PROC-03 (Phase 6).

CRITICAL RULE: Zero keyword, text-overlap, string-matching, or category logic is used.
Every grouping decision relies exclusively on vector embedding proximity.
"""

from __future__ import annotations

from datetime import UTC, datetime
import logging
from typing import Any

import numpy as np

try:
    import hdbscan
    import umap
except ImportError:
    hdbscan = None
    umap = None

from app.models.domain import Article, ArticleStatus, Event, EventArticle, EventStatus
from app.repositories.article_repository import ArticleRepository
from app.repositories.chroma_repository import ChromaRepository
from app.repositories.event_article_repository import EventArticleRepository
from app.repositories.event_repository import EventRepository

logger = logging.getLogger(__name__)


class ClusteringService:
    """Cluster processed articles into events based solely on embedding vector similarity."""

    def __init__(
        self,
        article_repository: ArticleRepository | None = None,
        event_repository: EventRepository | None = None,
        event_article_repository: EventArticleRepository | None = None,
        chroma_repository: ChromaRepository | None = None,
    ) -> None:
        self._article_repository = article_repository or ArticleRepository()
        self._event_repository = event_repository or EventRepository()
        self._event_article_repository = event_article_repository or EventArticleRepository()
        self._chroma_repository = chroma_repository or ChromaRepository()

    def cluster_vectors(
        self, article_ids: list[str], vectors: list[list[float]]
    ) -> list[list[str]]:
        """Cluster article IDs into groups using embedding vectors only.

        Returns a list of clusters, where each cluster is a list of article IDs.
        """
        n_samples = len(article_ids)
        if n_samples == 0:
            return []
        if n_samples == 1:
            return [[article_ids[0]]]

        X = np.array(vectors, dtype=np.float32)

        # For larger datasets (N >= 15), use UMAP + HDBSCAN if available
        if n_samples >= 15 and umap is not None and hdbscan is not None:
            try:
                n_neighbors = min(15, n_samples - 1)
                n_components = min(5, X.shape[1])
                reducer = umap.UMAP(
                    n_neighbors=n_neighbors,
                    n_components=n_components,
                    metric="cosine",
                    random_state=42,
                )
                umap_embeddings = reducer.fit_transform(X)
                clusterer = hdbscan.HDBSCAN(min_cluster_size=2, metric="euclidean")
                labels = clusterer.fit_predict(umap_embeddings)

                clusters_map: dict[int, list[str]] = {}
                singletons: list[str] = []

                for idx, label in enumerate(labels):
                    if label == -1:
                        singletons.append(article_ids[idx])
                    else:
                        clusters_map.setdefault(label, []).append(article_ids[idx])

                result_clusters = list(clusters_map.values())
                for singleton_id in singletons:
                    result_clusters.append([singleton_id])

                return result_clusters

            except Exception as exc:
                logger.warning("UMAP+HDBSCAN failed, falling back to cosine distance matrix: %s", exc)

        # Cosine distance threshold clustering for N < 15 or UMAP fallback
        norms = np.linalg.norm(X, axis=1, keepdims=True)
        norms[norms == 0] = 1e-6
        normalized_X = X / norms
        sim_matrix = np.dot(normalized_X, normalized_X.T)
        dist_matrix = 1.0 - sim_matrix

        visited = [False] * n_samples
        clusters: list[list[str]] = []
        distance_threshold = 0.35

        for i in range(n_samples):
            if visited[i]:
                continue
            cluster_indices = [i]
            visited[i] = True
            for j in range(i + 1, n_samples):
                if not visited[j] and dist_matrix[i, j] <= distance_threshold:
                    cluster_indices.append(j)
                    visited[j] = True
            clusters.append([article_ids[k] for k in cluster_indices])

        return clusters

    async def cluster_processed_articles(self, *, batch_size: int = 500) -> dict[str, Any]:
        """Fetch processed articles, extract embeddings, cluster by vector similarity, and persist events."""

        events_created = 0
        singleton_events = 0
        errors: list[str] = []

        try:
            processed_articles = await self._article_repository.list_by_status(
                ArticleStatus.PROCESSED, batch_size=batch_size
            )

            if not processed_articles:
                return {
                    "phase": "cluster",
                    "status": "done",
                    "events_created": 0,
                    "singleton_events": 0,
                    "errors": [],
                }

            valid_articles = [a for a in processed_articles if a.id]
            valid_ids = [a.id for a in valid_articles if a.id]
            article_by_id = {a.id: a for a in valid_articles if a.id}

            # Retrieve article embeddings from ChromaDB
            chroma_data = await self._chroma_repository.get("article_embeddings", ids=valid_ids)
            chroma_ids = chroma_data.get("ids") or []
            chroma_vectors = chroma_data.get("embeddings")

            if chroma_ids is None or len(chroma_ids) == 0 or chroma_vectors is None or len(chroma_vectors) == 0:
                logger.warning("No vectors found in article_embeddings for processed articles")
                return {
                    "phase": "cluster",
                    "status": "done",
                    "events_created": 0,
                    "singleton_events": 0,
                    "errors": ["No vectors retrieved from article_embeddings"],
                }

            id_to_vec = {cid: vec for cid, vec in zip(chroma_ids, chroma_vectors)}

            ordered_ids: list[str] = []
            ordered_vectors: list[list[float]] = []

            for aid in valid_ids:
                if aid in id_to_vec:
                    ordered_ids.append(aid)
                    ordered_vectors.append(id_to_vec[aid])

            if not ordered_ids:
                return {
                    "phase": "cluster",
                    "status": "done",
                    "events_created": 0,
                    "singleton_events": 0,
                    "errors": ["No matching vector IDs"],
                }

            # Run embedding-only clustering
            clusters = self.cluster_vectors(ordered_ids, ordered_vectors)

            # Persist events and event_articles
            for cluster_ids in clusters:
                try:
                    member_articles = [article_by_id[aid] for aid in cluster_ids if aid in article_by_id]
                    if not member_articles:
                        continue

                    dates = [a.published_at for a in member_articles if a.published_at]
                    first_at = min(dates) if dates else datetime.now(UTC)
                    latest_at = max(dates) if dates else datetime.now(UTC)

                    # Compute centroid vector for event
                    cluster_vectors = [id_to_vec[aid] for aid in cluster_ids if aid in id_to_vec]
                    if cluster_vectors:
                        centroid_vector = np.mean(cluster_vectors, axis=0).tolist()
                    else:
                        centroid_vector = [0.0] * 384

                    is_singleton = len(cluster_ids) == 1

                    # 1. Create Event record in MongoDB
                    event = Event(
                        article_count=len(cluster_ids),
                        status=EventStatus.CLUSTERED,
                        first_article_at=first_at,
                        latest_article_at=latest_at,
                    )
                    created_event = await self._event_repository.create(event)

                    if created_event and created_event.id:
                        # 2. Upsert event centroid vector to ChromaDB event_embeddings
                        await self._chroma_repository.upsert(
                            name="event_embeddings",
                            ids=[created_event.id],
                            embeddings=[centroid_vector],
                            metadatas=[{"event_id": created_event.id}],
                        )

                        # 3. Update event with centroid_embedding_id
                        await self._event_repository.update(
                            created_event.id,
                            {"centroid_embedding_id": created_event.id},
                        )

                        # 4. Create EventArticle links
                        for aid in cluster_ids:
                            await self._event_article_repository.create(
                                EventArticle(event_id=created_event.id, article_id=aid)
                            )

                        events_created += 1
                        if is_singleton:
                            singleton_events += 1

                except Exception as cluster_err:
                    logger.exception("Error persisting cluster")
                    errors.append(f"Cluster persistence error: {cluster_err}")

        except Exception as error:
            logger.exception("Error during clustering phase execution")
            errors.append(str(error))

        return {
            "phase": "cluster",
            "status": "done" if not errors else "done_with_errors",
            "events_created": events_created,
            "singleton_events": singleton_events,
            "errors": errors,
        }
