import os
import requests
from typing import Optional, List, Dict

PARALLEL_API_KEY = os.getenv("PARALLEL_AI_API_KEY")
PARALLEL_API_URL = "https://api.parallel.ai/v1/search"

class ParallelAIClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or PARALLEL_API_KEY
        if not self.api_key:
            raise ValueError("Parallel AI API key not found")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def search(self, query: str, max_results: int = 5) -> List[Dict]:
        """
        Search the web using Parallel AI
        """
        try:
            payload = {
                "query": query,
                "max_results": max_results
            }
            
            response = requests.post(
                PARALLEL_API_URL,
                json=payload,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            results = data.get("results", [])
            
            return [{
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "snippet": r.get("snippet", ""),
                "content": r.get("content", "")
            } for r in results]
            
        except Exception as e:
            print(f"Parallel AI search error: {e}")
            return []
    
    def search_multiple(self, queries: List[str]) -> List[Dict]:
        """
        Execute multiple searches and return combined results
        """
        all_results = []
        for query in queries:
            results = self.search(query)
            all_results.extend(results)
        return all_results

# Global client instance
parallel_client = ParallelAIClient() if PARALLEL_API_KEY else None
