"""Local TextRank fallback summarizer implementing FEAT-PROC-04 (Phase 7).

Pure local computation using sumy TextRank. No network calls.
"""

from __future__ import annotations

import logging

from sumy.nlp.tokenizers import Tokenizer
from sumy.parsers.plaintext import PlaintextParser
from sumy.summarizers.text_rank import TextRankSummarizer

logger = logging.getLogger(__name__)


class TextRankFallback:
    """Generate local extractive summaries using TextRank without network dependencies."""

    def summarize(self, text: str, max_words: int = 120, sentence_count: int = 3) -> str:
        """Extract top sentences up to max_words using TextRank."""
        if not text or not text.strip():
            return "No content available for summary."

        try:
            parser = PlaintextParser.from_string(text, Tokenizer("english"))
            summarizer = TextRankSummarizer()
            summary_sentences = summarizer(parser.document, sentence_count)
            summary_text = " ".join(str(sentence) for sentence in summary_sentences)

            if not summary_text.strip():
                words = text.split()[:max_words]
                return " ".join(words)

            words = summary_text.split()
            if len(words) <= max_words:
                return summary_text

            truncated = " ".join(words[:max_words])
            last_period = max(truncated.rfind("."), truncated.rfind("!"), truncated.rfind("?"))
            if last_period > 0:
                return truncated[: last_period + 1]

            return truncated + "..."

        except Exception as exc:
            logger.warning("Sumy TextRank parsing failed: %s; falling back to text truncation", exc)
            words = text.split()[:max_words]
            return " ".join(words)
