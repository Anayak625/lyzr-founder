import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class LyzrClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or settings.LYZR_API_KEY
        self.agent_base_url = settings.LYZR_AGENT_API_BASE_URL
        self.rag_base_url = settings.LYZR_RAG_API_BASE_URL

    def _make_request(self, base_url, method, endpoint, **kwargs):
        url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = {
            'x-api-key': self.api_key,
        }
        if 'json' in kwargs:
            headers['Content-Type'] = 'application/json'
        
        logger.debug(f"Making Lyzr request: {method} {url} with headers {list(headers.keys())} and data {kwargs}")
        
        try:
            response = requests.request(method, url, headers=headers, timeout=90, **kwargs)
            response.raise_for_status()
            if response.text:
                return response.json()
            return {}
        except requests.exceptions.HTTPError as e:
            logger.error(f"Lyzr HTTP Error for {url}: {e.response.status_code} - {e.response.text}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Lyzr Network Error for {url}: {e}")
            raise

    def create_rag_config(self, collection_name, model, vector_store_provider="pinecone"):
        payload = {
            "collection_name": collection_name,
            "llm_model": model,
            "embedding_model": "models/embedding-001",
            "vector_store_provider": vector_store_provider,
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID,
            "embedding_credential_id": settings.LYZR_EMBEDDING_CREDENTIAL_ID,
            "vector_db_credential_id": settings.LYZR_VECTOR_DB_CREDENTIAL_ID,
        }
        return self._make_request(self.rag_base_url, 'POST', 'rag/', json=payload)

    def create_agent(self, name, system_prompt, provider, model, temperature, top_p):
        payload = {
            "name": name,
            "system_prompt": system_prompt,
            "provider_id": provider,
            "model": model,
            "temperature": str(temperature),
            "top_p": str(top_p),
            "features": [],
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID,
        }
        return self._make_request(self.agent_base_url, 'POST', 'agents/', json=payload)
    
    def update_agent_with_rag(self, lyzr_agent_id, rag_id):
        endpoint = f"agents/{lyzr_agent_id}/"
        features_payload = {
            "features": [
                {
                    "type": "KNOWLEDGE_BASE",
                    "config": {
                        "lyzr_rag": {
                            "rag_id": rag_id,
                            "params": {"top_k": 5, "retrieval_type": "basic", "score_threshold": 0},
                        },
                        "agentic_rag": []
                    }
                },
                {
                    "type": "MEMORY",
                    "config": {"max_messages_context_count": 10}
                }
            ]
        }
        return self._make_request(self.agent_base_url, 'PATCH', endpoint, json=features_payload)

    def index_file(self, rag_id, file_obj, file_name):
        endpoint = f"train/pdf/?rag_id={rag_id}"
        files = {'file': (file_name, file_obj, 'application/pdf')}
        data = {"data_parser": "llmsherpa"}
        return self._make_request(self.rag_base_url, 'POST', endpoint, files=files, data=data)

    def index_url(self, rag_id, url):
        endpoint = f"train/webpage/?rag_id={rag_id}"
        payload = {"url": url}
        return self._make_request(self.rag_base_url, 'POST', endpoint, json=payload)

    def get_chat_response(self, agent_id, session_id, message, user_email, rag_id=None):
        """
        Gets a chat response from the Lyzr Agent.
        If a rag_id is provided, it's passed as an asset to enable RAG.
        """
        endpoint = "inference/chat/"
        payload = {
            "agent_id": agent_id,
            "session_id": str(session_id),
            "message": message,
            "user_id": user_email,
            "assets": [rag_id] if rag_id else []
        }
        return self._make_request(self.agent_base_url, 'POST', endpoint, json=payload)

    def summarize_text(self, text_to_summarize):
        endpoint = "tools/summarize/"
        payload = { "text": text_to_summarize }
        return self._make_request(self.agent_base_url, 'POST', endpoint, json=payload)