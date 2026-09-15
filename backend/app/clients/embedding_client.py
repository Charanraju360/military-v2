"""Embedding client implementing native batch vector generation for Phase 5 (FEAT-PROC-02)."""

from __future__ import annotations

import asyncio
import hashlib
import logging
from typing import Sequence

import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingClient:
    """Client for generating dense vector embeddings in batches."""

    def __init__(self, dimension: int = 384) -> None:
        self.dimension = dimension

    def _generate_vector(self, text: str) -> list[float]:
        """Generate a normalized dense float vector for text."""
        vec = np.zeros(self.dimension, dtype=np.float32)
        words = text.lower().split()
        if not words:
            vec[0] = 1.0
            return vec.tolist()

        for word in words:
            h = hashlib.sha256(word.encode("utf-8")).digest()
            idx1 = int.from_bytes(h[:4], "big") % self.dimension
            idx2 = int.from_bytes(h[4:8], "big") % self.dimension
            val1 = ((int.from_bytes(h[8:10], "big") / 65535.0) * 2.0) - 1.0
            val2 = ((int.from_bytes(h[10:12], "big") / 65535.0) * 2.0) - 1.0
            vec[idx1] += val1
            vec[idx2] += val2

        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = (vec / norm).tolist()
        else:
            vec[0] = 1.0
            vec = vec.tolist()

        return vec

    async def embed_batch(self, texts: Sequence[str]) -> list[list[float]]:
        """Generate normalized embedding vectors for a batch of text strings."""
        if not texts:
            return []

        return await asyncio.to_thread(
            lambda: [self._generate_vector(t) for t in texts]
        )
