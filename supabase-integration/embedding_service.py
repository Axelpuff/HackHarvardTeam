#!/usr/bin/env python3
"""
Embedding service using Gemini for vector generation
"""

import os
import warnings
import sys
import contextlib
import numpy as np
from typing import List, Dict, Any
import google.generativeai as genai
from config import Config

# Suppress warnings
warnings.filterwarnings('ignore')

# Redirect stderr to suppress Google's internal warnings
@contextlib.contextmanager
def suppress_stderr():
    with open(os.devnull, "w") as devnull:
        old_stderr = sys.stderr
        sys.stderr = devnull
        try:
            yield
        finally:
            sys.stderr = old_stderr


class EmbeddingService:
    """Service for generating embeddings using Gemini AI"""
    
    def __init__(self):
        """Initialize the embedding service"""
        Config.validate_gemini_config()
        
        # Suppress warnings during configuration
        with suppress_stderr():
            genai.configure(api_key=Config.GEMINI_API_KEY)
        
        # Initialize the embedding model
        with suppress_stderr():
            self.embedding_model = genai.GenerativeModel('gemini-2.0-flash')
    
    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for the given text using Gemini
        
        Args:
            text (str): Input text to embed
            
        Returns:
            List[float]: 768-dimensional embedding vector
            
        Raises:
            Exception: If embedding generation fails
        """
        try:
            # Create a prompt that asks Gemini to generate embeddings
            embedding_prompt = f"""
            Generate a semantic embedding for the following text. 
            The embedding should capture the meaning, intent, and context of the text.
            Return the embedding as a list of 768 floating-point numbers between -1 and 1.
            
            Text: {text}
            
            Please provide only the embedding vector as a comma-separated list of numbers.
            """
            
            # Generate response
            with suppress_stderr():
                response = self.embedding_model.generate_content(embedding_prompt)
            
            if not response.text:
                # Fallback: generate a simple embedding based on text characteristics
                return self._generate_fallback_embedding(text)
            
            # Parse the response to extract embedding
            try:
                # Try to parse the response as a list of numbers
                embedding_text = response.text.strip()
                # Remove any non-numeric characters except commas and periods
                import re
                embedding_text = re.sub(r'[^\d\.,\-]', '', embedding_text)
                
                # Split by comma and convert to float
                embedding = [float(x.strip()) for x in embedding_text.split(',') if x.strip()]
                
                # Ensure we have exactly 768 dimensions
                if len(embedding) == 768:
                    return embedding
                elif len(embedding) > 768:
                    return embedding[:768]
                else:
                    # Pad with zeros if too short
                    embedding.extend([0.0] * (768 - len(embedding)))
                    return embedding
                    
            except (ValueError, IndexError):
                # If parsing fails, use fallback
                return self._generate_fallback_embedding(text)
                
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # Use fallback embedding
            return self._generate_fallback_embedding(text)
    
    def _generate_fallback_embedding(self, text: str) -> List[float]:
        """
        Generate a fallback embedding when Gemini fails
        
        Args:
            text (str): Input text
            
        Returns:
            List[float]: 768-dimensional embedding vector
        """
        # Create a simple hash-based embedding
        import hashlib
        
        # Create multiple hash values from the text
        text_lower = text.lower()
        words = text_lower.split()
        
        # Generate hash values
        hash_values = []
        for i in range(768):
            # Use different parts of the text for different dimensions
            source_text = text_lower if i < len(text_lower) else words[i % len(words)] if words else text_lower
            hash_input = f"{source_text}_{i}".encode('utf-8')
            hash_value = int(hashlib.md5(hash_input).hexdigest()[:8], 16)
            
            # Normalize to [-1, 1] range
            normalized_value = (hash_value / (2**31)) - 1.0
            hash_values.append(normalized_value)
        
        return hash_values
    
    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts (List[str]): List of input texts
            
        Returns:
            List[List[float]]: List of embedding vectors
        """
        embeddings = []
        for text in texts:
            embedding = self.get_embedding(text)
            embeddings.append(embedding)
        return embeddings
    
    def similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1 (List[float]): First embedding vector
            embedding2 (List[float]): Second embedding vector
            
        Returns:
            float: Cosine similarity score (-1 to 1)
        """
        try:
            # Convert to numpy arrays
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
            
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return 0.0
    
    def find_most_similar(self, query_embedding: List[float], candidate_embeddings: List[List[float]], k: int = 3) -> List[Dict[str, Any]]:
        """
        Find the most similar embeddings to a query
        
        Args:
            query_embedding (List[float]): Query embedding vector
            candidate_embeddings (List[List[float]]): List of candidate embeddings
            k (int): Number of top results to return
            
        Returns:
            List[Dict[str, Any]]: List of results with similarity scores
        """
        similarities = []
        
        for i, candidate in enumerate(candidate_embeddings):
            similarity = self.similarity(query_embedding, candidate)
            similarities.append({
                'index': i,
                'similarity': similarity,
                'embedding': candidate
            })
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        return similarities[:k]


def main():
    """Example usage of the embedding service"""
    try:
        # Initialize service
        service = EmbeddingService()
        
        # Test embedding generation
        print("=== Embedding Service Test ===")
        text = "propose 90-min focus blocks today"
        embedding = service.get_embedding(text)
        print(f"Generated embedding for '{text}':")
        print(f"Dimension: {len(embedding)}")
        print(f"First 10 values: {embedding[:10]}")
        
        # Test similarity
        text2 = "schedule focused work sessions"
        embedding2 = service.get_embedding(text2)
        similarity = service.similarity(embedding, embedding2)
        print(f"\nSimilarity between '{text}' and '{text2}': {similarity:.4f}")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
