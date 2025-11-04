import os
import json
from typing import Dict, List, Optional
from anthropic import Anthropic
from integrations.github import get_github_client
from integrations.parallel_ai import parallel_client

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

class OnCallInvestigator:
    def __init__(self, anthropic_api_key: Optional[str] = None):
        self.anthropic_key = anthropic_api_key or ANTHROPIC_API_KEY
        if not self.anthropic_key:
            raise ValueError("Anthropic API key not found")
        self.client = Anthropic(api_key=self.anthropic_key)
    
    async def investigate(
        self,
        investigation_id: str,
        repo_owner: str,
        repo_name: str,
        error_message: str,
        deployment_logs: str = "",
        commit_sha: str = "",
        documents: List[str] = None,
        websocket_manager = None
    ) -> Dict:
        """
        Investigate an incident using Claude AI + web search + GitHub context
        """
        documents = documents or []
        
        # Step 1: Gather GitHub context
        await self._send_step(investigation_id, websocket_manager, 
                             "Fetching repository context from GitHub...", 
                             {"step": "github_context"})
        
        github_client = get_github_client()
        recent_commits = []
        commit_diff = ""
        
        if github_client:
            try:
                recent_commits = github_client.get_recent_commits(repo_owner, repo_name, limit=5)
                if commit_sha:
                    commit_diff = github_client.get_commit_diff(repo_owner, repo_name, commit_sha)
            except Exception as e:
                print(f"Error fetching GitHub data: {e}")
        
        # Step 2: Web search
        await self._send_step(investigation_id, websocket_manager,
                             f"Searching web for: {error_message[:100]}...",
                             {"step": "web_search"})
        
        search_queries = [
            f"{error_message} causes",
            f"{error_message} solution",
        ]
        
        web_results = []
        if parallel_client:
            web_results = parallel_client.search_multiple(search_queries)
        
        # Step 3: Analyze with Claude
        await self._send_step(investigation_id, websocket_manager,
                             "Analyzing with Claude AI...",
                             {"step": "claude_analysis"})
        
        analysis = await self._analyze_with_claude(
            error_message=error_message,
            deployment_logs=deployment_logs,
            recent_commits=recent_commits,
            commit_diff=commit_diff,
            documents=documents,
            web_results=web_results
        )
        
        await self._send_step(investigation_id, websocket_manager,
                             "Investigation complete!",
                             {"step": "completed", "result": analysis})
        
        return analysis
    
    async def _analyze_with_claude(
        self,
        error_message: str,
        deployment_logs: str,
        recent_commits: List[Dict],
        commit_diff: str,
        documents: List[str],
        web_results: List[Dict]
    ) -> Dict:
        """
        Use Claude AI to analyze the incident and suggest fixes
        """
        
        # Build context
        commits_summary = "\n".join([
            f"- {c['sha'][:7]}: {c['message']}" for c in recent_commits[:5]
        ])
        
        web_search_summary = "\n".join([
            f"- {r['title']}: {r['snippet'][:200]}" for r in web_results[:3]
        ])
        
        docs_summary = "\n".join(documents[:3]) if documents else "No documentation provided."
        
        prompt = f"""You are an on-call engineer investigating a deployment failure. Analyze the following information and provide:

1. Root cause analysis
2. Specific problematic code (if any)
3. Suggested fix with code
4. Whether to revert the commit or patch the code

INCIDENT DETAILS:
Error: {error_message}

DEPLOYMENT LOGS:
{deployment_logs[:1000] if deployment_logs else "No logs provided"}

RECENT COMMITS:
{commits_summary}

COMMIT DIFF:
{commit_diff[:1000] if commit_diff else "No diff available"}

UPLOADED DOCUMENTATION:
{docs_summary[:1000]}

WEB SEARCH RESULTS:
{web_search_summary}

Provide your analysis in JSON format:
{{
    "root_cause": "Brief explanation",
    "problematic_code": "Code snippet if applicable",
    "suggested_fix": "Specific fix with code",
    "action": "revert" or "patch",
    "confidence": "high" or "medium" or "low"
}}"""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            
            # Try to parse JSON from response
            try:
                # Extract JSON from markdown code blocks if present
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                result = json.loads(content)
            except:
                # Fallback: treat entire response as result
                result = {
                    "root_cause": content,
                    "problematic_code": "",
                    "suggested_fix": "",
                    "action": "manual_review",
                    "confidence": "low"
                }
            
            return result
            
        except Exception as e:
            print(f"Claude API error: {e}")
            return {
                "root_cause": f"Error analyzing: {str(e)}",
                "problematic_code": "",
                "suggested_fix": "",
                "action": "manual_review",
                "confidence": "low"
            }
    
    async def _send_step(self, investigation_id: str, websocket_manager, message: str, data: Dict):
        """Send step update via WebSocket"""
        if websocket_manager:
            await websocket_manager.send_message(investigation_id, {
                "type": "step_update",
                "message": message,
                "data": data
            })

# Global investigator instance
try:
    investigator = OnCallInvestigator() if ANTHROPIC_API_KEY else None
except Exception as e:
    print(f"Failed to initialize investigator: {e}")
    investigator = None
