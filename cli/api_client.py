import httpx
from typing import List, Dict, Any

API_BASE_URL = "https://pitayacore-api.pitayacode.io/api"
DEFAULT_TENANT_ID = "edd1ac37-5ff9-4e46-bc7f-fff3c414d718"
SYSTEM_ROLE = "SYSTEM"

class PitayaCoreAPI:
    def __init__(self, tenant_id: str = DEFAULT_TENANT_ID):
        self.tenant_id = tenant_id
        self.headers = {
            "x-user-role": SYSTEM_ROLE,
            "x-tenant-id": tenant_id
        }
        self.client = httpx.Client(base_url=API_BASE_URL, headers=self.headers, timeout=10.0)

    def fetch_tenants(self) -> List[Dict[str, Any]]:
        try:
            response = self.client.get("/tenants")
            response.raise_for_status()
            data = response.json()
            return data if isinstance(data, list) else []
        except Exception as e:
            print(f"Error fetching tenants: {e}")
            return []

    def fetch_notes(self) -> List[Dict[str, Any]]:
        try:
            response = self.client.get("/workspace/notes")
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "data" in data:
                return data["data"]
            return []
        except Exception as e:
            print(f"Error fetching notes: {e}")
            return []

    def create_note(self, title: str, content: str) -> Dict[str, Any]:
        try:
            payload = {
                "title": title,
                "content": content
            }
            response = self.client.post("/workspace/notes", json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error creating note: {e}")
            return {}

    def delete_note(self, note_id: str) -> bool:
        try:
            response = self.client.delete(f"/workspace/notes/{note_id}")
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error deleting note: {e}")
            return False

    def fetch_ideas(self) -> List[Dict[str, Any]]:
        try:
            response = self.client.get("/workspace/ideas")
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "data" in data:
                return data["data"]
            return []
        except Exception as e:
            print(f"Error fetching ideas: {e}")
            return []

    def fetch_documents(self) -> List[Dict[str, Any]]:
        try:
            response = self.client.get("/workspace/documents")
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "data" in data:
                return data["data"]
            return []
        except Exception as e:
            print(f"Error fetching documents: {e}")
            return []

    def global_search(self, query: str) -> List[Dict[str, Any]]:
        try:
            response = self.client.get(f"/workspace/search", params={"q": query})
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "data" in data:
                return data["data"]
            return []
        except Exception as e:
            print(f"Error during global search: {e}")
            return []

    def ask_ai(self, question: str) -> str:
        try:
            response = self.client.post("/workspace/ai/ask", json={"question": question})
            response.raise_for_status()
            data = response.json()
            return data.get("answer", "No se recibió respuesta.") if isinstance(data, dict) else str(data)
        except Exception as e:
            print(f"Error contacting AI: {e}")
            return "Ocurrió un error al contactar al AI Assistant."
