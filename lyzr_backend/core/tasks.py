import logging
from celery import shared_task
import json
from typing import Dict, Any
from django.utils import timezone
from .models import Agent, KnowledgeBase, KnowledgeSource, Conversation, Message
from .services.lyzr_client import LyzrClient, LyzrAPIError

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def setup_new_agent_task(self, agent_id: str):
    """
    A single, robust task to create the Lyzr stack for a new agent
    AND index its default knowledge source instruction file. This prevents race conditions.
    """
    try:
        agent = Agent.objects.select_related('knowledge_base').get(id=agent_id)
        kb = agent.knowledge_base
        client = LyzrClient()
        logger.info(f"Starting setup for new agent {agent_id}")

        # --- Part 1: Create the Lyzr RAG and Agent ---
        if not kb.lyzr_rag_id:
            logger.info(f"Creating RAG config for agent {agent_id}")
            rag_response = client.create_rag_config(kb.collection_name, agent.model)
            rag_id = rag_response.get('id')
            if not rag_id:
                raise ValueError("RAG API response missing 'id' field")
            kb.lyzr_rag_id = rag_id
            kb.save()
            logger.info(f"Successfully created RAG config {rag_id} for agent {agent_id}")
        else:
            rag_id = kb.lyzr_rag_id

        if not agent.lyzr_agent_id:
            logger.info(f"Creating Lyzr agent for local agent {agent_id}")
            agent_response = client.create_agent(agent=agent)
            lyzr_agent_id = agent_response.get('agent_id')
            if not lyzr_agent_id:
                raise ValueError("Agent API response missing 'agent_id' field")
            agent.lyzr_agent_id = lyzr_agent_id
            agent.save()
            logger.info(f"Successfully created Lyzr agent {lyzr_agent_id} for agent {agent_id}")
        else:
            lyzr_agent_id = agent.lyzr_agent_id
            
        logger.info(f"Linking RAG {rag_id} to agent {lyzr_agent_id}")
        client.update_agent_with_rag(lyzr_agent_id, rag_id, kb.collection_name, agent)
        logger.info(f"Successfully linked RAG to agent for agent {agent_id}")

        # --- Part 2: Index the Default Knowledge Source ---
        try:
            default_source = KnowledgeSource.objects.get(
                knowledge_base=kb,
                title="Default Support Instructions"
            )
        except KnowledgeSource.DoesNotExist:
            logger.warning(f"Default knowledge source not found for agent {agent_id}. Skipping initial indexing.")
            return # Setup is complete, just no default source to index

        default_source.status = KnowledgeSource.IndexingStatus.INDEXING
        default_source.save()

        logger.info(f"Indexing default source {default_source.id} for RAG {kb.lyzr_rag_id}")
        client.index_text_content(kb.lyzr_rag_id, default_source.content, default_source.title)
        
        default_source.status = KnowledgeSource.IndexingStatus.COMPLETED
        default_source.save()
        logger.info(f"Successfully indexed default source {default_source.id} for agent {agent_id}")

    except Agent.DoesNotExist:
        logger.error(f"Agent {agent_id} not found for setup.")
        return
    except LyzrAPIError as e:
        logger.error(f"Lyzr API error during agent setup for {agent_id}: {e}")
        # Optionally update agent status to FAILED here
        raise self.retry(exc=e)
    except Exception as exc:
        logger.error(f"Unexpected error during agent setup for {agent_id}: {exc}")
        # Optionally update agent status to FAILED here
        raise self.retry(exc=exc)


# This task is now effectively deprecated for initial creation but kept for safety.
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def create_lyzr_stack_task(self, agent_id: str):
    """
    DEPRECATED for initial agent creation. Use setup_new_agent_task.
    Creates Lyzr stack with proper error handling.
    """
    logger.warning(f"DEPRECATED: create_lyzr_stack_task called for {agent_id}. Delegating to setup_new_agent_task.")
    # For backward compatibility or accidental calls, we delegate to the new main task.
    setup_new_agent_task.apply_async(args=[agent_id])


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def index_knowledge_source_task(self, source_id: str):
    """
    Indexes a new knowledge source. This is used when a user adds a file, URL, etc.,
    after the agent has already been created.
    """
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
        elif source.type == 'TEXT':
            client.index_text_content(kb.lyzr_rag_id, source.content, source.title)
        
        source.status = KnowledgeSource.IndexingStatus.COMPLETED
        source.save()
        logger.info(f"Successfully indexed source {source.id}")

    except LyzrAPIError as e:
        if e.status_code == 404 and source.type == 'URL':
            logger.error(f"404 Error indexing URL source {source.id}: URL not found.")
            source.status = KnowledgeSource.IndexingStatus.FAILED
            source.error_message = "URL not found or inaccessible (404 Error). Please check the URL and try again."
            source.save()
            return
        
        logger.error(f"Indexing failed for source {source.id}. Error: {e}")
        source.status = KnowledgeSource.IndexingStatus.FAILED
        source.error_message = str(e)
        source.save()
        if e.status_code not in [400, 404, 422]: 
            raise self.retry(exc=e)
                
    except Exception as exc:
        logger.error(f"Unexpected error indexing source {source.id}: {exc}")
        source.status = KnowledgeSource.IndexingStatus.FAILED
        source.error_message = str(exc)
        source.save()
        raise self.retry(exc=exc)


# --- OTHER TASKS (UNCHANGED) ---

@shared_task
def summarize_conversation_task(conversation_id: str):
    """Enhanced conversation summarization with better error handling."""
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

@shared_task
def health_check_lyzr_api():
    """Health check task to monitor Lyzr API status."""
    try:
        client = LyzrClient()
        result = client.test_connection()
        if result.get('status') == 'healthy':
            logger.info("Lyzr API health check passed")
        else:
            logger.error(f"Lyzr API health check failed: {result.get('error')}")
        return result
    except Exception as e:
        logger.error(f"Health check failed with exception: {e}")
        return {"status": "error", "error": str(e)}

@shared_task
def retry_failed_knowledge_sources():
    """Retry failed knowledge source indexing."""
    failed_sources = KnowledgeSource.objects.filter(
        status=KnowledgeSource.IndexingStatus.FAILED,
        updated_at__lt=timezone.now() - timezone.timedelta(hours=1) # Only retry sources that failed over an hour ago
    )
    
    retry_count = 0
    for source in failed_sources:
        logger.info(f"Retrying failed knowledge source {source.id}")
        index_knowledge_source_task.delay(source.id)
        retry_count += 1
    
    if retry_count > 0:
        logger.info(f"Queued {retry_count} failed knowledge sources for retry")
    return retry_count

@shared_task
def cleanup_old_conversations():
    """Clean up old conversations based on retention policy."""
    from django.utils import timezone
    from datetime import timedelta
    
    # Delete conversations older than 7 days with no activity
    cutoff_date = timezone.now() - timedelta(days=7)
    old_conversations = Conversation.objects.filter(
        updated_at__lt=cutoff_date,
        status=Conversation.Status.RESOLVED
    )
    
    count = old_conversations.count()
    old_conversations.delete()
    
    logger.info(f"Cleaned up {count} old conversations")
    return count

@shared_task
def generate_usage_reports():
    """Generate usage reports for monitoring."""
    from django.utils import timezone
    from datetime import timedelta
    
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    
    daily_stats = {
        'date': yesterday.isoformat(),
        'conversations_created': Conversation.objects.filter(
            created_at__date=yesterday
        ).count(),
        'messages_sent': Message.objects.filter(
            created_at__date=yesterday
        ).count(),
        'knowledge_sources_indexed': KnowledgeSource.objects.filter(
            created_at__date=yesterday,
            status=KnowledgeSource.IndexingStatus.COMPLETED
        ).count(),
        'api_errors': 0 
    }
    
    logger.info(f"Daily usage stats: {daily_stats}")
    return daily_stats

@shared_task
def test_lyzr_connection():
    """Test Lyzr API connection manually."""
    try:
        client = LyzrClient()
        result = client.test_connection()
        logger.info(f"Lyzr connection test result: {result}")
        return result
    except Exception as e:
        logger.error(f"Lyzr connection test failed: {e}")
        return {"status": "error", "error": str(e)}
    
    
@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def update_lyzr_agent_task(self, agent_id: str):
    """
    Task to synchronize local agent updates with the Lyzr API.
    """
    try:
        agent = Agent.objects.get(id=agent_id)

        if not agent.lyzr_agent_id:
            logger.warning(f"Lyzr Agent ID not found for agent {agent.id}. Re-triggering creation.")
            create_lyzr_stack_task.delay(agent.id)
            return

        client = LyzrClient()

        try:
            lyzr_agent_data = client.get_agent(agent.lyzr_agent_id)
            existing_features = lyzr_agent_data.get("features", [])
        except LyzrAPIError as e:
            logger.error(f"Failed to fetch existing Lyzr agent {agent.lyzr_agent_id}. Error: {e}")
            existing_features = []

        logger.info(f"Syncing updates for agent {agent.id} to Lyzr agent {agent.lyzr_agent_id}")
        
        client.update_agent(
            lyzr_agent_id=agent.lyzr_agent_id,
            agent=agent, 
            features=existing_features 
        )
        
        logger.info(f"Successfully synced agent {agent.id} with Lyzr.")

    except Agent.DoesNotExist:
        logger.error(f"Agent {agent_id} not found for Lyzr update task.")
    except LyzrAPIError as e:
        logger.error(f"Lyzr API error updating agent {agent_id}: {e}")
        raise self.retry(exc=e)
    except Exception as exc:
        logger.error(f"Unexpected error updating Lyzr agent {agent_id}: {exc}")
        raise self.retry(exc=exc)
    
    
@shared_task(name="health_check_task")
def health_check_task():
    """
    A simple periodic task that runs to confirm the Celery worker is
    alive, connected, and processing tasks from the queue.
    """
    logger.info("CELERY BEAT HEARTBEAT: The Celery worker is alive and responsive.")
    return "Celery worker is active."