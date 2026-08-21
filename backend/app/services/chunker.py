import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class Chunk(BaseModel):
    chunk_id: str
    doc_id: str
    text: str
    strategy: str  # "semantic" | "fixed_overlap" | "metadata_adaptive"
    start_char: int
    end_char: int
    word_count: int
    metadata: Dict[str, Any]

class BaseChunker:
    """Abstract Base Class for Chunking Strategies"""
    def chunk(self, doc_id: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        raise NotImplementedError

class SemanticChunker(BaseChunker):
    """
    Strategy A: Semantic-Aware Chunking
    Splits text along paragraph and natural sentence boundaries, preserving semantic integrity
    and grouping contextually cohesive sentences.
    """
    def __init__(self, max_chunk_words: int = 150, min_chunk_words: int = 40):
        self.max_chunk_words = max_chunk_words
        self.min_chunk_words = min_chunk_words

    def chunk(self, doc_id: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        metadata = metadata or {}
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        chunk_idx = 0
        current_char = 0

        for para in paragraphs:
            # Split paragraph into sentences
            sentences = re.split(r'(?<=[.!?])\s+', para)
            current_chunk_sentences = []
            current_word_count = 0
            start_pos = text.find(para, current_char)
            if start_pos == -1:
                start_pos = current_char

            for sentence in sentences:
                words = sentence.split()
                if not words:
                    continue
                
                if current_word_count + len(words) > self.max_chunk_words and current_chunk_sentences:
                    chunk_text = " ".join(current_chunk_sentences)
                    end_pos = start_pos + len(chunk_text)
                    chunks.append(Chunk(
                        chunk_id=f"{doc_id}_sem_{chunk_idx}",
                        doc_id=doc_id,
                        text=chunk_text,
                        strategy="semantic",
                        start_char=start_pos,
                        end_char=end_pos,
                        word_count=current_word_count,
                        metadata={**metadata, "strategy_detail": "paragraph_sentence_semantic_split"}
                    ))
                    chunk_idx += 1
                    current_chunk_sentences = []
                    current_word_count = 0
                    start_pos = end_pos + 1

                current_chunk_sentences.append(sentence)
                current_word_count += len(words)

            if current_chunk_sentences:
                chunk_text = " ".join(current_chunk_sentences)
                end_pos = start_pos + len(chunk_text)
                chunks.append(Chunk(
                    chunk_id=f"{doc_id}_sem_{chunk_idx}",
                    doc_id=doc_id,
                    text=chunk_text,
                    strategy="semantic",
                    start_char=start_pos,
                    end_char=end_pos,
                    word_count=current_word_count,
                    metadata={**metadata, "strategy_detail": "paragraph_sentence_semantic_split"}
                ))
                chunk_idx += 1
                current_char = end_pos

        return chunks if chunks else [self._fallback_single_chunk(doc_id, text, metadata)]

    def _fallback_single_chunk(self, doc_id: str, text: str, metadata: Dict[str, Any]) -> Chunk:
        words = text.split()
        return Chunk(
            chunk_id=f"{doc_id}_sem_0",
            doc_id=doc_id,
            text=text,
            strategy="semantic",
            start_char=0,
            end_char=len(text),
            word_count=len(words),
            metadata={**metadata, "strategy_detail": "single_semantic_unit"}
        )


class FixedSizeOverlapChunker(BaseChunker):
    """
    Strategy B: Fixed-Size Fallback Chunking with Overlap
    Sliding window approach with fixed word capacity and overlap step to guarantee context preservation
    across split boundaries.
    """
    def __init__(self, chunk_size: int = 120, overlap: int = 30):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, doc_id: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        metadata = metadata or {}
        words = text.split()
        if not words:
            return []

        chunks = []
        step = max(1, self.chunk_size - self.overlap)
        chunk_idx = 0

        for i in range(0, len(words), step):
            chunk_words = words[i: i + self.chunk_size]
            chunk_text = " ".join(chunk_words)
            start_char = text.find(chunk_words[0]) if chunk_words else 0
            end_char = start_char + len(chunk_text)

            chunks.append(Chunk(
                chunk_id=f"{doc_id}_fix_{chunk_idx}",
                doc_id=doc_id,
                text=chunk_text,
                strategy="fixed_overlap",
                start_char=max(0, start_char),
                end_char=end_char,
                word_count=len(chunk_words),
                metadata={**metadata, "chunk_size": self.chunk_size, "overlap": self.overlap}
            ))
            chunk_idx += 1
            if i + self.chunk_size >= len(words):
                break

        return chunks


class MetadataAwareAdaptiveChunker(BaseChunker):
    """
    Strategy C: Metadata-Aware & Adaptive Chunking
    Dynamically adjusts chunk size according to structural headers, metadata tags, and content density.
    """
    def __init__(self, target_base_size: int = 100):
        self.target_base_size = target_base_size

    def chunk(self, doc_id: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        metadata = metadata or {}
        # Adapt chunk size based on metadata parameters (e.g. document type, query importance)
        importance_multiplier = metadata.get("importance_weight", 1.0)
        adapted_size = int(self.target_base_size * importance_multiplier)

        # Detect headers / sections
        sections = re.split(r'\n(?=[A-Z0-9\s\.\#]{3,30}\n)', text)
        chunks = []
        chunk_idx = 0

        for sec in sections:
            sec_clean = sec.strip()
            if not sec_clean:
                continue

            words = sec_clean.split()
            if len(words) <= adapted_size:
                chunks.append(Chunk(
                    chunk_id=f"{doc_id}_ada_{chunk_idx}",
                    doc_id=doc_id,
                    text=sec_clean,
                    strategy="metadata_adaptive",
                    start_char=0,
                    end_char=len(sec_clean),
                    word_count=len(words),
                    metadata={**metadata, "adapted_size": adapted_size, "has_section_header": True}
                ))
                chunk_idx += 1
            else:
                # Sub-split long section adaptively
                sub_chunker = FixedSizeOverlapChunker(chunk_size=adapted_size, overlap=20)
                sub_chunks = sub_chunker.chunk(f"{doc_id}_sub", sec_clean, metadata)
                for sc in sub_chunks:
                    sc.chunk_id = f"{doc_id}_ada_{chunk_idx}"
                    sc.strategy = "metadata_adaptive"
                    sc.metadata["adapted_size"] = adapted_size
                    chunks.append(sc)
                    chunk_idx += 1

        return chunks if chunks else [Chunk(
            chunk_id=f"{doc_id}_ada_0",
            doc_id=doc_id,
            text=text,
            strategy="metadata_adaptive",
            start_char=0,
            end_char=len(text),
            word_count=len(text.split()),
            metadata={**metadata, "adapted_size": adapted_size}
        )]


class MultiStrategyChunkerEngine:
    """Unified Orchestrator for Multi-Strategy Chunking"""
    def __init__(self):
        self.semantic_chunker = SemanticChunker()
        self.fixed_chunker = FixedSizeOverlapChunker()
        self.adaptive_chunker = MetadataAwareAdaptiveChunker()

    def chunk_document(
        self,
        doc_id: str,
        text: str,
        strategy: str = "semantic",
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Chunk]:
        metadata = metadata or {}
        if strategy == "semantic":
            return self.semantic_chunker.chunk(doc_id, text, metadata)
        elif strategy == "fixed_overlap":
            return self.fixed_chunker.chunk(doc_id, text, metadata)
        elif strategy == "metadata_adaptive":
            return self.adaptive_chunker.chunk(doc_id, text, metadata)
        elif strategy == "hybrid_all":
            # Produce chunks from all strategies for benchmarking comparative retrieval
            chunks = []
            chunks.extend(self.semantic_chunker.chunk(doc_id, text, metadata))
            chunks.extend(self.fixed_chunker.chunk(doc_id, text, metadata))
            chunks.extend(self.adaptive_chunker.chunk(doc_id, text, metadata))
            return chunks
        else:
            return self.semantic_chunker.chunk(doc_id, text, metadata)
