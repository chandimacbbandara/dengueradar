"""Lightweight TF-IDF Retrieval-Augmented Generation (RAG) Service."""

import os
import re
import logging
from typing import List

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

logger = logging.getLogger(__name__)

KNOWLEDGE_BASE_PATH = os.path.join(os.path.dirname(__file__), "data", "dengue_facts.txt")


class RAGService:
    def __init__(self):
        self.chunks: List[str] = []
        self.vectorizer = None
        self.tfidf_matrix = None
        self._load_and_index()

    def _load_and_index(self):
        if not HAS_SKLEARN:
            logger.warning("[RAGService] scikit-learn is not installed. RAG will just return the full text.")
            
        try:
            with open(KNOWLEDGE_BASE_PATH, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Split by double newline (paragraphs/sections)
            raw_chunks = [c.strip() for c in content.split("\n\n") if c.strip()]
            
            # Sub-chunking: If a chunk is very long, split by single newline or sentences
            final_chunks = []
            for chunk in raw_chunks:
                if len(chunk) > 1000:
                    sub_chunks = [sc.strip() for sc in chunk.split("\n") if sc.strip()]
                    final_chunks.extend(sub_chunks)
                else:
                    final_chunks.append(chunk)
            
            self.chunks = [c for c in final_chunks if len(c) > 20]
            
            if HAS_SKLEARN and self.chunks:
                self.vectorizer = TfidfVectorizer(stop_words='english')
                self.tfidf_matrix = self.vectorizer.fit_transform(self.chunks)
                
            logger.info("[RAGService] Loaded and indexed %d knowledge chunks.", len(self.chunks))
        except Exception as e:
            logger.error("[RAGService] Error loading knowledge base: %s", e)
            self.chunks = []

    def get_relevant_context(self, query: str, top_k: int = 3) -> str:
        """Retrieve the most relevant chunks for the given query."""
        if not self.chunks:
            return ""
            
        if not HAS_SKLEARN or self.vectorizer is None or self.tfidf_matrix is None:
            # Fallback: Just return the whole text if it's small enough, or first chunks
            return "\n\n".join(self.chunks[:top_k])
            
        try:
            # Transform the query
            query_vec = self.vectorizer.transform([query])
            
            # Compute cosine similarity
            sim = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
            
            # Get top_k indices
            top_indices = sim.argsort()[-top_k:][::-1]
            
            # Filter out chunks with 0 similarity
            relevant_chunks = []
            for idx in top_indices:
                if sim[idx] > 0.05: # Minimum similarity threshold
                    relevant_chunks.append(self.chunks[idx])
                    
            if not relevant_chunks:
                # Fallback: if the query didn't match any specific keywords (e.g., conversational "what should I do"),
                # provide the entire small knowledge base so the LLM has full context to answer from.
                return "\n\n".join(self.chunks)
                
            return "\n\n---\n\n".join(relevant_chunks)
            
        except Exception as e:
            logger.error("[RAGService] Error retrieving context: %s", e)
            return "\n\n".join(self.chunks)

# Singleton instance
rag_retriever = RAGService()

def retrieve_knowledge(query: str) -> str:
    return rag_retriever.get_relevant_context(query)
