# FINAL FIX: LyzrClient with Correct URL Endpoint

import requests
import logging
import time
from typing import Dict, Any, Optional, List
from django.conf import settings
import secrets

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
        
        logger.debug(f"Making Lyzr request: {method} {url} with headers {list(headers.keys())}")
        
        for attempt in range(max_retries + 1):
            try:
                response = self.session.request(method, url, timeout=90, **kwargs)
                logger.debug(f"Response status: {response.status_code}, content: {response.text[:200]}")
                
                if 200 <= response.status_code < 300:
                    return response.json() if response.text else {}

                error_data = {}
                try:
                    error_data = response.json()
                except ValueError:
                    error_data = {'detail': response.text}

                if response.status_code in [404, 422]: # Don't retry client errors
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

    def create_rag_config(self, collection_name: str, model: str) -> Dict[str, Any]:
        payload = {
            "user_id": settings.LYZR_API_KEY,
            "collection_name": collection_name,
            "llm_model": model, "embedding_model": "text-embedding-ada-002",
            "vector_store_provider": "Weaviate [Lyzr]",
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID,
            "embedding_credential_id": settings.LYZR_EMBEDDING_CREDENTIAL_ID,
            "vector_db_credential_id": settings.LYZR_VECTOR_DB_CREDENTIAL_ID,
        }
        return self._make_request(self.rag_base_url, 'POST', 'v3/rag/', json=payload)

    def create_agent(self, name: str, system_prompt: str, provider: str, model: str, temperature: float, top_p: float) -> Dict[str, Any]:
        payload = {
            "name": name, "system_prompt": system_prompt,
            "description": f"AI Agent: {name}", "provider_id": provider, "model": model,
            "temperature": str(temperature), "top_p": str(top_p), "features": [], "tools": [],
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID, "response_format": {}
        }
        return self._make_request(self.agent_base_url, 'POST', 'v3/agents/', json=payload)
    
    def get_agent(self, lyzr_agent_id: str) -> Dict[str, Any]:
        return self._make_request(self.agent_base_url, 'GET', f"v3/agents/{lyzr_agent_id}")

    def update_agent(self, lyzr_agent_id: str, name: str, system_prompt: str, model: str, temperature: float, top_p: float, features: List) -> Dict[str, Any]:
        """
        NEW: General purpose method to update an existing agent on the Lyzr platform.
        This sends a complete payload using PUT.
        """
        endpoint = f"v3/agents/{lyzr_agent_id}"
        
        provider_map = {
            'gpt': 'OpenAI',
            'gemini': 'Google',
            'claude': 'Anthropic'
        }
        provider = provider_map.get(model.split('-')[0], 'OpenAI')

        # This payload must be complete, as PUT replaces the resource.
        payload = {
            "name": name,
            "system_prompt": system_prompt,
            "description": f"AI Agent: {name}",
            "provider_id": provider,
            "model": model,
            "temperature": str(temperature),
            "top_p": str(top_p),
            "features": features, # Pass the existing features
            "tools": [],
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID,
            "response_format": {"type": "text"}
        }

        logger.info(f"Updating Lyzr agent {lyzr_agent_id} with new data.")
        return self._make_request(self.agent_base_url, 'PUT', endpoint, json=payload)
    
    def update_agent_with_rag(self, lyzr_agent_id: str, rag_id: str,collection: str) -> Dict[str, Any]:
        logger.info(f"Getting existing agent config for {lyzr_agent_id}")
        existing_agent = self.get_agent(lyzr_agent_id)
        
        features_with_priority = [
            {"type": "KNOWLEDGE_BASE", "config": {"lyzr_rag": {"base_url": "https://rag-prod.studio.lyzr.ai","rag_id": rag_id,"rag_name": collection, "params": {"top_k": 5,"retrieval_type": "basic", "score_threshold": 0.4}}}, "priority": 0},
            {"type": "MEMORY", "config": {"max_messages_context_count": 10}, "priority": 1}
        ]
        
        complete_payload = {**existing_agent, "features": features_with_priority}
        
        # Remove fields that shouldn't be in the PUT payload
        for key in ['agent_id', 'created_at', 'updated_at', 'created_by', 'updated_by']:
            complete_payload.pop(key, None)

        logger.info(f"Updating agent {lyzr_agent_id} with complete payload including RAG.")
        return self._make_request(self.agent_base_url, 'PUT', f"v3/agents/{lyzr_agent_id}", json=complete_payload)
    
    def index_file(self, rag_id: str, file_obj, file_name: str) -> Dict[str, Any]:
        """Index file with support for multiple file types."""
        # Determine file type and endpoint
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
        
        # Determine MIME type
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
        """
        FIXED: Index URL with correct endpoint from official Lyzr API docs.
        
        The correct endpoint is 'v3/train/website/', not 'v3/train/web/'
        """
        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            raise LyzrAPIError(f"Invalid URL format: {url}. URL must start with http:// or https://")
        
        # FIXED: Use correct endpoint from Lyzr API Swagger documentation
        endpoint = f"v3/train/website/?rag_id={rag_id}"
        payload = {"url": url}
        
        try:
            logger.info(f"Training website URL: {url} for RAG: {rag_id}")
            response = self._make_request(self.rag_base_url, 'POST', endpoint, json=payload)
            logger.info(f"Successfully indexed URL: {url}")
            return response
        except LyzrAPIError as e:
            # Handle specific URL errors
            if e.status_code == 404:
                logger.error(f"404 Error: Website training endpoint not found. Check if endpoint is correct: {endpoint}")
                raise LyzrAPIError(f"Website training endpoint not found. URL: {url}")
            elif "invalid url" in str(e).lower():
                raise LyzrAPIError(f"Invalid URL format: {url}")
            elif "timeout" in str(e).lower():
                raise LyzrAPIError(f"URL indexing timeout for: {url}")
            raise

    def index_text_content(self, rag_id: str, text_content: str, title: str = "Text Content") -> Dict[str, Any]:
        """Index plain text content directly."""
        endpoint = f"v3/train/txt/?rag_id={rag_id}"
        
        # Create a pseudo-file for text content
        files = {'file': (f'{title}.txt', text_content, 'text/plain')}
        data = {"data_parser": "txt_parser"}
        
        return self._make_request(self.rag_base_url, 'POST', endpoint, files=files, data=data)

    def get_chat_response(self, agent_id: str, session_id: str, message: str, user_email: str, rag_id: Optional[str] = None) -> Dict[str, Any]:
        """Get chat response with better error handling and response parsing."""
        endpoint = "v3/inference/chat/"
        payload = {
            "agent_id": agent_id,
            "session_id": str(session_id),
            "message": message,
            "user_id": user_email,
            "assets": [rag_id] if rag_id else []
        }
        
        try:
            response = self._make_request(self.agent_base_url, 'POST', endpoint, json=payload)
            
            # Enhanced response parsing - handle multiple response formats
            if isinstance(response, dict):
                # Try multiple possible response structures
                possible_keys = ['response', 'agent_response', 'message', 'content', 'text']
                for key in possible_keys:
                    if key in response:
                        response_value = response[key]
                        if isinstance(response_value, dict) and 'response' in response_value:
                            return {"response": {"response": response_value['response']}}
                        elif isinstance(response_value, str):
                            return {"response": {"response": response_value}}
                        
            return response
            
        except LyzrAPIError as e:
            logger.error(f"Chat API error: {e}")
            raise

    def summarize_text(self, text_to_summarize: str) -> Dict[str, Any]:
        """Summarize text - working correctly."""
        endpoint = "v3/tools/summarize/"
        payload = {"text": text_to_summarize}
        return self._make_request(self.agent_base_url, 'POST', endpoint, json=payload)

    def test_connection(self) -> Dict[str, Any]:
        """Test API connection and credentials."""
        try:
            # Test agent API
            agent_response = self._make_request(self.agent_base_url, 'GET', 'v3/agents/', max_retries=1)
            
            # Test RAG API  
            rag_response = self._make_request(self.rag_base_url, 'GET', 'v3/rag/', max_retries=1)
            
            return {
                "status": "healthy",
                "agent_api": "connected",
                "rag_api": "connected",
                "timestamp": time.time()
            }
        except Exception as e:
            return {
                "status": "error", 
                "error": str(e),
                "timestamp": time.time()
            }