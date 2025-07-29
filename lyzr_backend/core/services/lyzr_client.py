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
        
        # Configure session with retry strategy
        self.session.headers.update({
            'User-Agent': 'Lyzr-Django-Client/1.0'
        })

    def _make_request(self, base_url: str, method: str, endpoint: str, max_retries: int = 3, **kwargs) -> Dict[str, Any]:
        """Make HTTP request with proper error handling and retry logic."""
        url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = {
            'x-api-key': self.api_key,
        }
        
        if 'json' in kwargs:
            headers['Content-Type'] = 'application/json'
            
        # Add headers to kwargs
        if 'headers' in kwargs:
            kwargs['headers'].update(headers)
        else:
            kwargs['headers'] = headers
            
        logger.debug(f"Making Lyzr request: {method} {url} with headers {list(headers.keys())}")
        
        for attempt in range(max_retries + 1):
            try:
                response = self.session.request(method, url, timeout=90, **kwargs)
                
                # Log response details
                logger.debug(f"Response status: {response.status_code}, content: {response.text[:500]}{'...' if len(response.text) > 500 else ''}")
                
                # Handle different status codes
                if response.status_code == 200:
                    if response.text:
                        return response.json()
                    return {}
                elif response.status_code == 404:
                    # Don't retry 404s - they indicate wrong endpoint or missing resource
                    try:
                        error_data = response.json()
                        error_msg = f"HTTP Error 404 for {url}: {error_data}"
                        logger.error(f"404 Not Found for {url}: {error_data}")
                        raise LyzrAPIError(error_msg, 404, error_data)
                    except ValueError:
                        error_msg = f"HTTP Error 404 for {url}: {response.text}"
                        logger.error(f"404 Not Found for {url}: {response.text}")
                        raise LyzrAPIError(error_msg, 404)
                elif response.status_code == 422:
                    # Validation error - don't retry
                    try:
                        error_data = response.json()
                        error_msg = f"Validation Error 422: {error_data.get('detail', 'Unknown validation error')}"
                        logger.error(f"422 Validation Error for {url}: {error_data}")
                        raise LyzrAPIError(error_msg, 422, error_data)
                    except ValueError:
                        error_msg = f"Validation Error 422: {response.text}"
                        logger.error(f"422 Validation Error for {url}: {response.text}")
                        raise LyzrAPIError(error_msg, 422)
                elif response.status_code == 429:
                    # Rate limiting - retry with exponential backoff
                    if attempt < max_retries:
                        wait_time = 2 ** attempt
                        logger.warning(f"Rate limited (429). Retrying in {wait_time}s... Attempt {attempt + 1}/{max_retries + 1}")
                        time.sleep(wait_time)
                        continue
                    else:
                        error_msg = f"Rate limit exceeded after {max_retries} retries"
                        logger.error(error_msg)
                        raise LyzrAPIError(error_msg, 429)
                elif 500 <= response.status_code < 600:
                    # Server error - retry
                    if attempt < max_retries:
                        wait_time = 2 ** attempt
                        logger.warning(f"Server error {response.status_code}. Retrying in {wait_time}s... Attempt {attempt + 1}/{max_retries + 1}")
                        time.sleep(wait_time)
                        continue
                    else:
                        error_msg = f"Server error {response.status_code} after {max_retries} retries: {response.text}"
                        logger.error(error_msg)
                        raise LyzrAPIError(error_msg, response.status_code)
                else:
                    # Other HTTP errors
                    try:
                        error_data = response.json()
                        error_msg = f"HTTP Error {response.status_code} for {url}: {error_data}"
                        logger.error(error_msg)
                        raise LyzrAPIError(error_msg, response.status_code, error_data)
                    except ValueError:
                        error_msg = f"HTTP Error {response.status_code} for {url}: {response.text}"
                        logger.error(error_msg)
                        raise LyzrAPIError(error_msg, response.status_code)
                        
            except requests.exceptions.RequestException as e:
                if attempt < max_retries:
                    wait_time = 2 ** attempt
                    logger.warning(f"Network error: {e}. Retrying in {wait_time}s... Attempt {attempt + 1}/{max_retries + 1}")
                    time.sleep(wait_time)
                    continue
                else:
                    error_msg = f"Network error after {max_retries} retries: {e}"
                    logger.error(error_msg)
                    raise LyzrAPIError(error_msg)

    def create_rag_config(self, collection_name: str, model: str, vector_store_provider: str = "Weaviate [Lyzr]") -> Dict[str, Any]:
        """Create RAG configuration - working correctly."""
        print("-------------------------------------------------____________------------>",collection_name)
        user_id = settings.LYZR_API_KEY  # 16 hex characters (8 bytes)
        payload = {
            "user_id": user_id,
            "collection_name": collection_name,
            "llm_model": model,
            "embedding_model": "text-embedding-ada-002",
            "vector_store_provider": vector_store_provider,
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID,
            "embedding_credential_id": settings.LYZR_EMBEDDING_CREDENTIAL_ID,
            "vector_db_credential_id": settings.LYZR_VECTOR_DB_CREDENTIAL_ID,
        }
        return self._make_request(self.rag_base_url, 'POST', 'v3/rag/', json=payload)

    def create_agent(self, name: str, system_prompt: str, provider: str, model: str, temperature: float, top_p: float) -> Dict[str, Any]:
        """Create agent - working correctly."""
        payload = {
            "name": name,
            "system_prompt": system_prompt,
            "description": f"AI Agent: {name}",
            "provider_id": provider,
            "model": model,
            "temperature": str(temperature),
            "top_p": str(top_p),
            "features": [],
            "tools": [],
            "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID,
            "response_format": {}
        }
        return self._make_request(self.agent_base_url, 'POST', 'v3/agents/', json=payload)
    
    def get_agent(self, lyzr_agent_id: str) -> Dict[str, Any]:
        """Get existing agent configuration."""
        endpoint = f"v3/agents/{lyzr_agent_id}"
        return self._make_request(self.agent_base_url, 'GET', endpoint)

    def update_agent_with_rag(self, lyzr_agent_id: str, rag_id: str) -> Dict[str, Any]:
        """Update agent with RAG configuration using complete payload."""
        try:
            # Step 1: Get existing agent configuration
            logger.info(f"Getting existing agent configuration for {lyzr_agent_id}")
            existing_agent = self.get_agent(lyzr_agent_id)
            
            # Step 2: Create features with proper priority values
            features_with_priority = [
                {
                    "type": "KNOWLEDGE_BASE",
                    "config": {
                        "lyzr_rag": {
                            "rag_id": rag_id,
                            "params": {
                                "top_k": 5,
                                "retrieval_type": "basic", 
                                "score_threshold": 0
                            }
                        },
                        "agentic_rag": []
                    },
                    "priority": 0  # CRITICAL: Priority field is required
                },
                {
                    "type": "MEMORY",
                    "config": {
                        "max_messages_context_count": 10
                    },
                    "priority": 1  # CRITICAL: Priority field is required
                }
            ]
            
            # Step 3: Build complete payload with all required fields
            complete_payload = {
                "name": existing_agent.get("name", "AI Agent"),
                "system_prompt": existing_agent.get("system_prompt", "You are a helpful AI assistant."),
                "description": existing_agent.get("description", "AI Agent"),
                "features": features_with_priority,
                "tools": existing_agent.get("tools", []),
                "llm_credential_id": existing_agent.get("llm_credential_id", settings.LYZR_LLM_CREDENTIAL_ID),
                "provider_id": existing_agent.get("provider_id", "OpenAI"),
                "model": existing_agent.get("model", "gpt-4o-mini"),
                "top_p": existing_agent.get("top_p", 1.0),
                "temperature": existing_agent.get("temperature", 0.2),
                "response_format": existing_agent.get("response_format", {})
            }
            
            # Step 4: PUT the complete payload
            endpoint = f"v3/agents/{lyzr_agent_id}"
            logger.info(f"Updating agent {lyzr_agent_id} with complete payload including RAG features")
            
            return self._make_request(self.agent_base_url, 'PUT', endpoint, json=complete_payload)
            
        except LyzrAPIError as e:
            logger.error(f"Error linking RAG to agent: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error linking RAG to agent: {e}")
            raise LyzrAPIError(f"Unexpected error: {e}")

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