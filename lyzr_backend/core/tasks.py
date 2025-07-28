import logging
from celery import shared_task
import json
from .models import Agent, KnowledgeBase, KnowledgeSource, Conversation
from .services.lyzr_client import LyzrClient

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def create_lyzr_stack_task(self, agent_id):
    try:
        agent = Agent.objects.get(id=agent_id)
        kb = agent.knowledge_base
        client = LyzrClient()

        if not kb.lyzr_rag_id:
            logger.info(f"Creating RAG config for agent {agent_id}")
            rag_response = client.create_rag_config(kb.collection_name, agent.model)
            rag_id = rag_response.get('id')
            if not rag_id:
                raise ValueError("RAG API response missing 'id'")
            kb.lyzr_rag_id = rag_id
            kb.save()
            logger.info(f"Successfully created RAG config {rag_id} for agent {agent_id}")
        else:
            rag_id = kb.lyzr_rag_id
            logger.info(f"RAG config {rag_id} already exists for agent {agent_id}")

        if not agent.lyzr_agent_id:
            logger.info(f"Creating Lyzr agent for local agent {agent_id}")
            provider_map = {'gpt': 'OpenAI', 'gemini': 'Google'}
            provider = provider_map.get(agent.model.split('-')[0], 'OpenAI')
            
            agent_response = client.create_agent(
                name=agent.name,
                system_prompt=agent.system_prompt,
                provider=provider,
                model=agent.model,
                temperature=agent.temperature,
                top_p=agent.top_p
            )
            lyzr_agent_id = agent_response.get('agent_id')
            if not lyzr_agent_id:
                raise ValueError("Agent API response missing 'agent_id'")
            agent.lyzr_agent_id = lyzr_agent_id
            agent.save()
            logger.info(f"Successfully created Lyzr agent {lyzr_agent_id} for agent {agent_id}")
        else:
            lyzr_agent_id = agent.lyzr_agent_id
            logger.info(f"Lyzr agent {lyzr_agent_id} already exists for agent {agent_id}")
        
        logger.info(f"Linking RAG {rag_id} to agent {lyzr_agent_id}")
        client.update_agent_with_rag(lyzr_agent_id, rag_id)
        logger.info(f"Successfully linked RAG to agent for agent {agent_id}")

    except Exception as exc:
        logger.error(f"Error creating Lyzr stack for agent {agent_id}: {exc}")
        raise self.retry(exc=exc)

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def index_knowledge_source_task(self, source_id):
    try:
        source = KnowledgeSource.objects.select_related('knowledge_base').get(id=source_id)
        kb = source.knowledge_base
        if not kb.lyzr_rag_id:
            logger.warning(f"RAG config ID missing for KB {kb.id}, retrying task for source {source_id}")
            raise self.retry(countdown=60)
    except KnowledgeSource.DoesNotExist:
        logger.error(f"KnowledgeSource {source_id} not found.")
        return

    source.status = KnowledgeSource.IndexingStatus.INDEXING
    source.save()
    client = LyzrClient()

    try:
        logger.info(f"Indexing source {source.id} of type {source.type} for RAG {kb.lyzr_rag_id}")
        if source.type == 'FILE':
            with source.file.open('rb') as f:
                client.index_file(kb.lyzr_rag_id, f, source.file.name)
        elif source.type == 'URL':
            client.index_url(kb.lyzr_rag_id, source.content)
        
        source.status = KnowledgeSource.IndexingStatus.COMPLETED
        source.save()
        logger.info(f"Successfully indexed source {source.id}")

    except Exception as exc:
        try:
            response_text = exc.response.text
            if "already exists" in response_text and "class name" in response_text:
                logger.warning(f"Ignoring known 'class name already exists' API error for source {source.id}.")
                source.status = KnowledgeSource.IndexingStatus.COMPLETED
                source.save()
                return
        except (AttributeError, json.JSONDecodeError):
            pass
        
        logger.error(f"Indexing failed for source {source.id}. Error: {exc}")
        source.status = KnowledgeSource.IndexingStatus.FAILED
        source.save()
        raise self.retry(exc=exc)

@shared_task
def summarize_conversation_task(conversation_id):
    try:
        conversation = Conversation.objects.prefetch_related('messages').get(id=conversation_id)
        if conversation.messages.count() < 4:
            logger.info(f"Not enough messages to summarize conversation {conversation_id}")
            return
            
        transcript = "\n".join([f"{msg.sender_type}: {msg.content}" for msg in conversation.messages.all()])
        client = LyzrClient()
        response = client.summarize_text(transcript)
        summary = response.get('summary')
        
        if summary:
            conversation.summary = summary
            conversation.save()
            logger.info(f"Successfully summarized conversation {conversation_id}")
            
    except Conversation.DoesNotExist:
        logger.error(f"Conversation {conversation_id} not found for summarization.")
    except Exception as e:
        logger.error(f"Failed to summarize conversation {conversation_id}: {e}")