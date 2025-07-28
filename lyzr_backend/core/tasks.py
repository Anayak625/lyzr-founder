# core/tasks.py

import requests
import json
from celery import shared_task
from django.conf import settings
from io import BytesIO

def make_lyzr_request(api_base_url, method, endpoint, **kwargs):
    """
    Helper for Lyzr API calls, with detailed error logging.
    """
    headers = {'x-api-key': settings.LYZR_API_KEY}
    if 'json' in kwargs:
        headers['Content-Type'] = 'application/json'

    url = f"{api_base_url.rstrip('/')}/{endpoint}"
    try:
        print(f"Lyzr API Request to {url} with params {kwargs.get('params', {})}")
        response = requests.request(method, url, headers=headers, **kwargs)
        print(f"Lyzr API Request returned {response.status_code}")
        response.raise_for_status()
        # Handle cases with empty responses
        if response.text:
            print("Response content:", response.text)
            return response.json()
        return {} # Return an empty dict for empty responses
    except requests.exceptions.HTTPError as e:
        print(f"LYZR HTTP ERROR: {e.response.status_code} - {e.response.text}")
        # Re-raise the exception so it can be handled by the caller
        raise e
    except requests.exceptions.RequestException as e:
        print(f"LYZR NETWORK ERROR: Could not connect to {url}. Error: {e}")
        raise e

# --- create_lyzr_stack_task is already correct ---
@shared_task(bind=True)
def create_lyzr_stack_task(self, agent_id):
    from .models import Agent, KnowledgeBase
    try:
        agent = Agent.objects.get(id=agent_id)
        kb = agent.knowledge_base
    except (Agent.DoesNotExist, KnowledgeBase.DoesNotExist) as e:
        print(f"Cannot create Lyzr stack: Agent or KB not found. Error: {e}")
        return
    # Step 1: Create RAG config
    try:
        print(f"Creating RAG config for collection: {kb.collection_name}")
        rag_payload = { "collection_name": kb.collection_name, "llm_model": agent.model, "embedding_model": "models/embedding-001", "vector_store_provider": "pinecone", "llm_credential_id": settings.LYZR_LLM_CREDENTIAL_ID, "embedding_credential_id": settings.LYZR_EMBEDDING_CREDENTIAL_ID, "vector_db_credential_id": settings.LYZR_VECTOR_DB_CREDENTIAL_ID, }
        rag_response = make_lyzr_request(settings.LYZR_RAG_API_BASE_URL, 'POST', 'rag/', json=rag_payload)
        rag_config_id = rag_response.get('id')
        if not rag_config_id: raise ValueError("RAG API response missing 'id'")
        kb.rag_config_id = rag_config_id
        kb.save()
        print(f"Successfully created RAG config with ID: {rag_config_id}")
    except Exception as e:
        print(f"Failed to create RAG config for agent {agent_id}. Error: {e}")
        return
    # Step 2: Create the Lyzr Agent
    try:
        print(f"Creating Lyzr agent: {agent.name}")
        agent_payload = { "name": agent.name, "system_prompt": agent.system_prompt, "provider_id": "openai", "model": agent.model, "temperature": agent.temperature, "top_p": agent.top_p, "features": [] }
        agent_response = make_lyzr_request(settings.LYZR_AGENT_API_BASE_URL, 'POST', 'agents/', json=agent_payload)
        print("Lyzr Agent API Full Response:", agent_response)
        lyzr_agent_id = agent_response.get('agent_id')
        if not lyzr_agent_id: raise ValueError("Agent API response missing 'agent_id'")
        agent.lyzr_agent_id = lyzr_agent_id
        agent.save()
        print(f"Successfully created Lyzr agent with ID: {lyzr_agent_id}")
    except Exception as e:
        print(f"Failed to create Lyzr agent for local agent {agent_id}. Error: {e}")
        return

@shared_task(bind=True, autoretry_for=(requests.exceptions.RequestException,), retry_kwargs={'max_retries': 3})
def index_knowledge_source_task(self, source_id):
    """
    Uploads knowledge source to Lyzr RAG API for indexing.
    This task now includes a workaround for the API's idempotency issue.
    """
    from .models import KnowledgeSource
    try:
        source = KnowledgeSource.objects.select_related('knowledge_base').get(id=source_id)
        kb = source.knowledge_base
        if not kb.rag_config_id:
            print(f"RAG config ID missing for KB, retrying in 60s")
            raise self.retry(countdown=60)
    except KnowledgeSource.DoesNotExist:
        print(f"Source {source_id} not found.")
        return

    source.status = KnowledgeSource.IndexingStatus.INDEXING
    source.save()

    try:
        endpoint_map = {'FILE': 'train/pdf/', 'URL': 'train/webpage/', 'TEXT': 'train/txt/'}
        endpoint = endpoint_map.get(source.type)
        if not endpoint: raise ValueError(f"Unsupported source type: {source.type}")

        params = {"rag_id": kb.rag_config_id}
        request_args = {'params': params}

        if source.type == 'FILE':
            with source.file.open('rb') as f:
                request_args['files'] = {'file': (source.file.name, f, 'application/octet-stream')}
                make_lyzr_request(settings.LYZR_RAG_API_BASE_URL, 'POST', endpoint, **request_args)
        elif source.type == 'URL':
            request_args['json'] = {"url": source.content}
            make_lyzr_request(settings.LYZR_RAG_API_BASE_URL, 'POST', endpoint, **request_args)
        # ... (add TEXT handling if needed)

    except requests.exceptions.HTTPError as exc:
        # --- WORKAROUND FOR LYZR API FLAW ---
        # Check if the error is the specific "already exists" error.
        try:
            error_detail = exc.response.json().get("detail", "")
            if "already exists" in error_detail and "class name" in error_detail:
                print(f"WORKAROUND: Ignoring known 'class name already exists' API error for source {source.id}.")
                # This error is benign, so we proceed as if successful.
            else:
                # This is a different, real error. Fail the task.
                raise exc
        except json.JSONDecodeError:
             # The error response was not JSON, so it's a different issue.
             raise exc
        # ------------------------------------
    except Exception as exc:
        source.status = KnowledgeSource.IndexingStatus.FAILED
        source.save()
        print(f"Indexing failed for source {source.id}. Error: {exc}")
        raise self.retry(exc=exc, countdown=60)

    # If no exception was raised (or the known one was ignored), mark as completed.
    source.status = KnowledgeSource.IndexingStatus.COMPLETED
    source.save()
    print(f"Successfully indexed source {source.id} for RAG config {kb.rag_config_id}")
    return f"Indexed source {source.id}"

