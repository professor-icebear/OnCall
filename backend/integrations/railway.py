import os
import requests
from typing import Optional, Dict
import time

RAILWAY_API_KEY = os.getenv("RAILWAY_API_KEY")
RAILWAY_API_URL = "https://backboard.railway.com/graphql/v2"

class RailwayClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or RAILWAY_API_KEY
        if self.api_key:
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
        else:
            self.headers = None
    
    def get_project_by_name(self, project_name: str) -> Optional[Dict]:
        """Get Railway project by name"""
        if not self.api_key:
            return None
            
        try:
            # First, get all projects
            query = """
            query {
                projects {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }
            """
            
            response = requests.post(
                RAILWAY_API_URL,
                json={"query": query},
                headers=self.headers,
                timeout=30
            )
            
            # Debug response
            if response.status_code != 200:
                print(f"❌ Railway API HTTP error: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                try:
                    error_data = response.json()
                    print(f"Error details: {error_data}")
                except:
                    pass
                return None
                
            data = response.json()
            
            # Check for errors
            if "errors" in data:
                print(f"Railway API GraphQL errors: {data['errors']}")
                return None
            
            # Debug: print available projects
            print(f"Debug: Railway API response keys: {data.keys()}")
            
            # Find project by name
            edges = data.get("data", {}).get("projects", {}).get("edges", [])
            print(f"DEBUG: Found {len(edges)} projects")
            for edge in edges:
                print(f"DEBUG: Project: {edge['node']['name']} (ID: {edge['node']['id']})")
                if edge["node"]["name"] == project_name:
                    print(f"✅ Found project '{project_name}' with ID: {edge['node']['id']}")
                    return edge["node"]
            
            print(f"⚠️  Railway project '{project_name}' not found")
            print(f"Available projects: {[e['node']['name'] for e in edges]}")
            return None
            
        except Exception as e:
            print(f"Railway API error: {e}")
            return None
    
    def list_all_projects(self) -> list:
        """List all Railway projects for debugging"""
        if not self.api_key:
            return []
            
        try:
            query = """
            query {
                projects {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }
            """
            
            response = requests.post(
                RAILWAY_API_URL,
                json={"query": query},
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"Railway list_all_projects HTTP error: {response.status_code}")
                print(f"Response: {response.text}")
                return []
                
            data = response.json()
            
            if "errors" in data:
                print(f"Railway GraphQL errors: {data['errors']}")
                return []
            
            edges = data.get("data", {}).get("projects", {}).get("edges", [])
            return [edge["node"]["name"] for edge in edges]
            
        except Exception as e:
            print(f"Railway API error: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_deployment_status(self, project_id: str) -> Optional[Dict]:
        """Get latest deployment status for a project"""
        if not self.api_key:
            return None
            
        try:
            query = f"""
            query {{
                project(id: "{project_id}") {{
                    services {{
                        edges {{
                            node {{
                                id
                                name
                                deployments {{
                                    edges {{
                                        node {{
                                            id
                                            status
                                            createdAt
                                        }}
                                    }}
                                }}
                            }}
                        }}
                    }}
                }}
            }}
            """
            
            response = requests.post(
                RAILWAY_API_URL,
                json={"query": query},
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"❌ Get deployments HTTP error: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return None
                
            data = response.json()
            
            if "errors" in data:
                print(f"❌ Railway GraphQL deployment errors: {data['errors']}")
                return None
            
            # Get deployments from all services
            services = data.get("data", {}).get("project", {}).get("services", {}).get("edges", [])
            all_deployments = []
            
            for service_edge in services:
                service = service_edge["node"]
                deployments = service.get("deployments", {}).get("edges", [])
                for deployment_edge in deployments:
                    deployment = deployment_edge["node"]
                    deployment["service_name"] = service.get("name")
                    deployment["service_id"] = service.get("id")
                    all_deployments.append(deployment)
            
            # Sort by creation date (newest first)
            all_deployments.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            
            print(f"DEBUG: Found {len(all_deployments)} total deployments across all services")
            if all_deployments:
                latest = all_deployments[0]
                print(f"DEBUG: Latest deployment - Status: {latest.get('status')}, ID: {latest.get('id')}, Service: {latest.get('service_name')}")
                return latest
            return None
            
        except Exception as e:
            print(f"Railway API error: {e}")
            import traceback
            traceback.print_exc()
            return None

# Global client instance
railway_client = RailwayClient() if RAILWAY_API_KEY else None
