import requests
from celery import shared_task
from django.conf import settings
from .models import Agent, KnowledgeBase, KnowledgeSource

def make_lyzr_request(api_base_url, method, endpoint, **kwargs):
    print(f"DEBUG: Using API Key ending in '...{settings.LYZR_API_KEY[-4:]}'")
    headers = {'x-api-key': settings.LYZR_API_KEY}
    if 'json' in kwargs:
        headers['Content-Type'] = 'application/json'
    url = f"{api_base_url.rstrip('/')}/{endpoint}"
    try:
        response = requests.request(method, url, headers=headers, **kwargs)
        print(f"Lyzr API Request to {url} returned {response.status_code}")
        response.raise_for_status()
        return response.json() if response.text else {}
    except requests.exceptions.HTTPError as e:
        print(f"LYZR API ERROR: {e.response.status_code} - {e.response.text}")
        raise e

@shared_task(bind=True)
def create_lyzr_stack_task(self, agent_id):
    try:
        agent = Agent.objects.get(id=agent_id)
        kb = agent.knowledge_base
    except (Agent.DoesNotExist, KnowledgeBase.DoesNotExist) as e:
        print(f"Cannot create Lyzr stack: Agent or KB not found for local agent ID {agent_id}. Error: {e}")
        return

    try:
        print(f"Creating RAG config for collection: {kb.collection_name}")
        rag_payload = {"collection_name": kb.collection_name, "llm_model": agent.model, "embedding_model": "models/embedding-001", "vector_store_provider": "pinecone" }
        rag_response = make_lyzr_request(settings.LYZR_RAG_API_BASE_URL, 'POST', 'rag/', json=rag_payload)
        rag_config_id = rag_response.get('config_id')
        if not rag_config_id: raise ValueError("RAG API response missing 'config_id'")
        kb.rag_config_id = rag_config_id
        kb.save()
        print(f"Successfully created RAG config with ID: {rag_config_id}")
    except Exception as e:
        print(f"Failed to create RAG config for agent {agent_id}. Error: {e}")
        return

    try:
        print(f"Creating Lyzr agent: {agent.name}")
        agent_payload = {"name": agent.name, "system_prompt": agent.system_prompt, "provider_id": "openai", "model": agent.model, "temperature": agent.temperature, "features": []}
        agent_response = make_lyzr_request(settings.LYZR_AGENT_API_BASE_URL, 'POST', 'agents/', json=agent_payload)
        lyzr_agent_id = agent_response.get('id') # The create agent endpoint returns 'id'
        if not lyzr_agent_id: raise ValueError("Agent API response missing 'id'")
        agent.lyzr_agent_id = lyzr_agent_id
        agent.save()
        print(f"Successfully created Lyzr agent with ID: {lyzr_agent_id}")
    except Exception as e:
        print(f"Failed to create Lyzr agent for local agent {agent_id}. Error: {e}")
        return

@shared_task(bind=True, autoretry_for=(requests.exceptions.RequestException,), retry_kwargs={'max_retries': 3})
def index_knowledge_source_task(self, source_id):
    try:
        source = KnowledgeSource.objects.select_related('knowledge_base').get(id=source_id)
        kb = source.knowledge_base
        if not kb.rag_config_id:
            print(f"RAG config ID for KB {kb.id} not yet available. Retrying in 60s.")
            raise self.retry(countdown=60)
    except KnowledgeSource.DoesNotExist: return f"Source {source_id} not found."
    source.status = KnowledgeSource.IndexingStatus.INDEXING
    source.save()
    try:
        endpoint_map = {'FILE': 'train/pdf/', 'URL': 'train/webpage/', 'TEXT': 'train/txt/'}
        endpoint = endpoint_map.get(source.type)
        if not endpoint: raise ValueError(f"Unsupported source type: {source.type}")
        payload = {"rag_config_id": kb.rag_config_id}
        if source.type == 'FILE':
            with source.file.open('rb') as f:
                files = {'file': (source.file.name, f, 'application/octet-stream')}
                make_lyzr_request(settings.LYZR_RAG_API_BASE_URL, 'POST', endpoint, data=payload, files=files)
        elif source.type == 'URL':
            payload["url"] = source.content
            make_lyzr_request(settings.LYZR_RAG_API_BASE_URL, 'POST', endpoint, json=payload)
        elif source.type == 'TEXT':
            from io import BytesIO
            temp_file = BytesIO(source.content.encode('utf-8'))
            temp_file.name = f"{source.id}.txt"
            files = {'file': temp_file}
            make_lyzr_request(settings.LYZR_RAG_API_BASE_URL, 'POST', endpoint, data=payload, files=files)
        source.status = KnowledgeSource.IndexingStatus.COMPLETED
        source.save()
        return f"Successfully indexed source {source.id} for RAG config {kb.rag_config_id}."
    except Exception as exc:
        source.status = KnowledgeSource.IndexingStatus.FAILED
        source.save()
        raise self.retry(exc=exc)