import requests
import logging
import time
from typing import Dict, Any, Optional, List
from django.conf import settings
import json
from core.models import Agent

logger = logging.getLogger(__name__)

class LyzrAPIError(Exception):
    """Custom exception for Lyzr API errors with detailed information."""
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data or {}
        super().__init__(self.message)

class LyzrClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.LYZR_API_KEY
        self.agent_base_url = settings.LYZR_AGENT_API_BASE_URL
        self.rag_base_url = settings.LYZR_RAG_API_BASE_URL
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Lyzr-Django-Client/1.0'})

    def _make_request(self, base_url: str, method: str, endpoint: str, max_retries: int = 3, **kwargs) -> Dict[str, Any]:
        url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = {'x-api-key': self.api_key}
        if 'json' in kwargs:
            headers['Content-Type'] = 'application/json'
        kwargs['headers'] = {**headers, **kwargs.get('headers', {})}
        
        logger.debug(f"Making Lyzr request: {method} {url} with payload {kwargs.get('json')}")
        
        for attempt in range(max_retries + 1):
            try:
                response = self.session.request(method, url, timeout=90, **kwargs)
                logger.debug(f"Response status: {response.status_code}, content: {response.text[:500]}")
                
                if 200 <= response.status_code < 300:
                    return response.json() if response.text else {}

                error_data = {}
                try:
                    error_data = response.json()
                except ValueError:
                    error_data = {'detail': response.text}

                if response.status_code in [404, 422]:
                    error_msg = f"HTTP Error {response.status_code}: {error_data.get('detail', 'Unknown error')}"
                    logger.error(f"{error_msg} for URL: {url}")
                    raise LyzrAPIError(error_msg, response.status_code, error_data)
                
                if attempt < max_retries:
                    wait_time = 2 ** attempt
                    logger.warning(f"Server error {response.status_code}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    error_msg = f"Request failed after {max_retries} retries with status {response.status_code}"
                    raise LyzrAPIError(error_msg, response.status_code, error_data)
            except requests.exceptions.RequestException as e:
                if attempt < max_retries:
                    wait_time = 2 ** attempt
                    logger.warning(f"Network error: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                raise LyzrAPIError(f"Network error after retries: {e}")

    ### NEW HELPER METHOD ###
    def _build_agent_payload(self, agent: Agent) -> Dict[str, Any]:
        """
        Builds the complete agent payload expected by the Lyzr API,
        using individual fields from our Agent model.
        """
        provider_map = {
            'gpt': 'OpenAI',
            'gemini': 'Google',
            'claude': 'Anthropic'
        }
        provider = provider_map.get(agent.model.split('-')[0], 'OpenAI')

        # This structure now matches the desired payload
        payload = {
            "name": agent.name,
            "description": agent.description or f"AI Agent: {agent.name}",
            "agent_role": agent.agent_role,
            "agent_goal": agent.agent_goal,
            "agent_instructions": agent.agent_instructions,
            "examples": agent.examples,
            "tool": "",  # Static field from your desired payload
            "tool_usage_description": "{}",  # Static field from your desired payload
            "provider_id": provider,
            "model": agent.model,
            "temperature": str(agent.temperature),
            "top_p": str(agent.top_p),
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID,
            "features": [], # Features will be added separately for updates
            "managed_agents": [], # Static field from your desired payload
            "response_format": {"type": "text"}
        }
        # The 'system_prompt' field is intentionally omitted as per your requirement.
        return payload

    def create_rag_config(self, collection_name: str, model: str) -> Dict[str, Any]:
        payload = {
            "user_id": settings.LYZR_API_KEY, "collection_name": collection_name,
            "llm_model": model, "embedding_model": "text-embedding-ada-002",
            "vector_store_provider": "Weaviate [Lyzr]",
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID,
            "embedding_credential_id": settings.LYZR_EMBEDDING_CREDENTIAL_ID,
            "vector_db_credential_id": settings.LYZR_VECTOR_DB_CREDENTIAL_ID,
        }
        return self._make_request(self.rag_base_url, 'POST', 'v3/rag/', json=payload)
    
    ### MODIFIED to use the new payload builder ###
    def create_agent(self, agent: Agent) -> Dict[str, Any]:
        """Creates an agent using the structured payload."""
        payload = self._build_agent_payload(agent)
        # Note: Initial creation might not need features. If it does, they can be added here.
        # For now, features are added during the update/linking step.
        payload["features"] = [
             {"type": "MEMORY", "config": {"max_messages_context_count": 10}, "priority": 1}
        ]
        
        logger.info(f"Creating Lyzr agent with structured payload for agent {agent.id}")
        return self._make_request(self.agent_base_url, 'POST', 'v3/agents/', json=payload)

    def get_agent(self, lyzr_agent_id: str) -> Dict[str, Any]:
        return self._make_request(self.agent_base_url, 'GET', f"v3/agents/{lyzr_agent_id}")

    ### MODIFIED to use the new payload builder ###
    def update_agent(self, lyzr_agent_id: str, agent: Agent, features: List) -> Dict[str, Any]:
        """
        Updates an existing agent on Lyzr using the correct structured payload.
        """
        endpoint = f"v3/agents/{lyzr_agent_id}"
        
        # Build the base payload from our model
        payload = self._build_agent_payload(agent)
        
        # Add the existing/updated features (like Knowledge Base and Memory)
        payload["features"] = features
        
        logger.info(f"Updating Lyzr agent {lyzr_agent_id} with new structured data.")
        return self._make_request(self.agent_base_url, 'PUT', endpoint, json=payload)
    
    def update_agent_with_rag(self, lyzr_agent_id: str, rag_id: str, collection: str, agent_model: Agent) -> Dict[str, Any]:
        """Links RAG by performing a full agent update, preserving all other fields."""
        logger.info(f"Getting existing agent config for {lyzr_agent_id}")
        # Build the complete payload from our local agent model
        payload = self._build_agent_payload(agent_model)

        # Define the features, including the new Knowledge Base
        features_with_priority = [
            {"type": "KNOWLEDGE_BASE", "config": {"lyzr_rag": {"base_url": "https://rag-prod.studio.lyzr.ai","rag_id": rag_id,"rag_name": collection, "params": {"top_k": 5,"retrieval_type": "basic", "score_threshold": 0.4}}}, "priority": 0},
            {"type": "MEMORY", "config": {"max_messages_context_count": 10}, "priority": 1}
        ]
        
        payload['features'] = features_with_priority

        logger.info(f"Updating agent {lyzr_agent_id} with complete payload including RAG.")
        return self._make_request(self.agent_base_url, 'PUT', f"v3/agents/{lyzr_agent_id}", json=payload)
        
    # ... (the rest of the file: index_file, index_url, etc. remains the same) ...
    def index_file(self, rag_id: str, file_obj, file_name: str) -> Dict[str, Any]:
        """Index file with support for multiple file types."""
        file_extension = file_name.lower().split('.')[-1]
        
        file_config = {
            'pdf': {'endpoint': 'v3/train/pdf/', 'parser': 'llmsherpa'},
            'docx': {'endpoint': 'v3/train/docx/', 'parser': 'docx2txt'},
            'doc': {'endpoint': 'v3/train/docx/', 'parser': 'docx2txt'},
            'txt': {'endpoint': 'v3/train/txt/', 'parser': 'txt_parser'},
            'csv': {'endpoint': 'v3/train/csv/', 'parser': 'csv_parser'},
            'json': {'endpoint': 'v3/train/txt/', 'parser': 'txt_parser'},
            'html': {'endpoint': 'v3/train/txt/', 'parser': 'txt_parser'},
            'md': {'endpoint': 'v3/train/txt/', 'parser': 'txt_parser'}
        }
        
        if file_extension not in file_config:
            raise LyzrAPIError(f"Unsupported file type: {file_extension}")
            
        config = file_config[file_extension]
        endpoint = f"{config['endpoint']}?rag_id={rag_id}"
        
        mime_types = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'json': 'application/json',
            'html': 'text/html',
            'md': 'text/markdown'
        }
        
        files = {'file': (file_name, file_obj, mime_types.get(file_extension, 'application/octet-stream'))}
        data = {"data_parser": config['parser']}
        
        return self._make_request(self.rag_base_url, 'POST', endpoint, files=files, data=data)

    def index_url(self, rag_id: str, url: str) -> Dict[str, Any]:
        if not url.startswith(('http://', 'https://')):
            raise LyzrAPIError(f"Invalid URL format: {url}. URL must start with http:// or https://")
        
        endpoint = f"v3/train/website/?rag_id={rag_id}"
        payload = {"url": url}
        
        try:
            logger.info(f"Training website URL: {url} for RAG: {rag_id}")
            response = self._make_request(self.rag_base_url, 'POST', endpoint, json=payload)
            logger.info(f"Successfully indexed URL: {url}")
            return response
        except LyzrAPIError as e:
            if e.status_code == 404:
                logger.error(f"404 Error: Website training endpoint not found. Check if endpoint is correct: {endpoint}")
                raise LyzrAPIError(f"Website training endpoint not found. URL: {url}")
            raise

    def index_text_content(self, rag_id: str, text_content: str, title: str = "Text Content") -> Dict[str, Any]:
        endpoint = f"v3/train/txt/?rag_id={rag_id}"
        files = {'file': (f'{title}.txt', text_content, 'text/plain')}
        data = {"data_parser": "txt_parser"}
        return self._make_request(self.rag_base_url, 'POST', endpoint, files=files, data=data)

    def get_chat_response(self, agent_id: str, session_id: str, message: str, user_email: str, rag_id: Optional[str] = None) -> Dict[str, Any]:
        endpoint = "v3/inference/chat/"
        payload = {
            "agent_id": agent_id, "session_id": str(session_id), "message": message,
            "user_id": user_email, "assets": [rag_id] if rag_id else []
        }
        return self._make_request(self.agent_base_url, 'POST', endpoint, json=payload)

    def summarize_text(self, text_to_summarize: str) -> Dict[str, Any]:
        endpoint = "v3/tools/summarize/"
        payload = {"text": text_to_summarize}
        return self._make_request(self.agent_base_url, 'POST', endpoint, json=payload)

    def test_connection(self) -> Dict[str, Any]:
        try:
            self._make_request(self.agent_base_url, 'GET', 'v3/agents/', max_retries=1)
            self._make_request(self.rag_base_url, 'GET', 'v3/rag/', max_retries=1)
            return {"status": "healthy", "agent_api": "connected", "rag_api": "connected", "timestamp": time.time()}
        except Exception as e:
            return {"status": "error", "error": str(e), "timestamp": time.time()}