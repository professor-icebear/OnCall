import os
from typing import Optional, List, Dict
from github import Github

class GitHubClient:
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token or os.getenv("GITHUB_ACCESS_TOKEN")
        if not self.access_token:
            raise ValueError("GitHub access token not found")
        self.github = Github(self.access_token)
    
    def get_repo(self, owner: str, name: str):
        """Get repository by owner and name"""
        return self.github.get_repo(f"{owner}/{name}")
    
    def get_recent_commits(self, owner: str, name: str, limit: int = 5) -> List[Dict]:
        """Get recent commits from the repository"""
        try:
            repo = self.get_repo(owner, name)
            commits = repo.get_commits()[:limit]
            
            return [{
                "sha": commit.sha,
                "message": commit.commit.message,
                "author": commit.commit.author.name,
                "date": commit.commit.author.date.isoformat(),
                "url": commit.html_url
            } for commit in commits]
        except Exception as e:
            print(f"Error fetching commits: {e}")
            return []
    
    def get_commit_diff(self, owner: str, name: str, sha: str) -> str:
        """Get diff for a specific commit"""
        try:
            repo = self.get_repo(owner, name)
            commit = repo.get_commit(sha)
            return commit.patch or ""
        except Exception as e:
            print(f"Error fetching commit diff: {e}")
            return ""
    
    def get_file_content(self, owner: str, name: str, path: str) -> Optional[str]:
        """Get content of a file"""
        try:
            repo = self.get_repo(owner, name)
            file = repo.get_contents(path)
            if file.encoding == "base64":
                import base64
                return base64.b64decode(file.content).decode('utf-8')
            return file.content
        except Exception as e:
            print(f"Error fetching file content: {e}")
            return None
    
    def search_code(self, owner: str, name: str, query: str, limit: int = 5) -> List[Dict]:
        """Search code in the repository"""
        try:
            repo = self.get_repo(owner, name)
            results = self.github.search_code(f"{query} repo:{owner}/{name}")[:limit]
            
            return [{
                "path": result.path,
                "url": result.html_url,
                "name": result.name
            } for result in results]
        except Exception as e:
            print(f"Error searching code: {e}")
            return []

# For demo purposes, we'll handle None access token
def get_github_client(access_token: Optional[str] = None) -> Optional[GitHubClient]:
    try:
        return GitHubClient(access_token)
    except ValueError:
        return None
