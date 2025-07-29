# UPDATED TASKS.PY - With Fixed URL Endpoint Error Handling

import logging
from celery import shared_task
import json
from typing import Dict, Any
from django.utils import timezone
from .models import Agent, KnowledgeBase, KnowledgeSource, Conversation, Message
from .services.lyzr_client import LyzrClient, LyzrAPIError

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def create_lyzr_stack_task(self, agent_id: str):
    """Create Lyzr stack with proper error handling for 422 validation errors."""
    try:
        agent = Agent.objects.get(id=agent_id)
        kb = agent.knowledge_base
        client = LyzrClient()

        logger.info(f"Creating Lyzr stack for agent {agent_id}")

        # Step 1: Create RAG config if needed
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
            logger.info(f"RAG config {rag_id} already exists for agent {agent_id}")

        # Step 2: Create Lyzr agent if needed
        if not agent.lyzr_agent_id:
            logger.info(f"Creating Lyzr agent for local agent {agent_id}")
            
            # Map model to provider
            provider_map = {
                'gpt': 'OpenAI',
                'gemini': 'Google',
                'claude': 'Anthropic'
            }
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
                raise ValueError("Agent API response missing 'agent_id' field")
            agent.lyzr_agent_id = lyzr_agent_id
            agent.save()
            logger.info(f"Successfully created Lyzr agent {lyzr_agent_id} for agent {agent_id}")
        else:
            lyzr_agent_id = agent.lyzr_agent_id
            logger.info(f"Lyzr agent {lyzr_agent_id} already exists for agent {agent_id}")
        
        # Step 3: Link RAG to agent (FIXED - now uses complete payload)
        logger.info(f"Linking RAG {rag_id} to agent {lyzr_agent_id}")
        try:
            client.update_agent_with_rag(lyzr_agent_id, rag_id)
            logger.info(f"Successfully linked RAG to agent for agent {agent_id}")
        except LyzrAPIError as e:
            if e.status_code == 422:
                logger.error(f"422 Validation Error linking RAG to agent: {e.response_data}")
                # Don't retry 422 errors - they indicate a code problem
                raise ValueError(f"Agent update validation failed: {e.message}")
            else:
                # Other errors can be retried
                logger.error(f"Error linking RAG to agent: {e}")
                raise

        logger.info(f"Successfully completed Lyzr stack creation for agent {agent_id}")

    except Agent.DoesNotExist:
        logger.error(f"Agent {agent_id} not found")
        return
    except LyzrAPIError as e:
        if e.status_code == 422:
            logger.error(f"422 Validation Error in Lyzr stack creation: {e.response_data}")
            # Don't retry validation errors
            return
        else:
            logger.error(f"Lyzr API error creating stack for agent {agent_id}: {e}")
            raise self.retry(exc=e)
    except Exception as exc:
        logger.error(f"Unexpected error creating Lyzr stack for agent {agent_id}: {exc}")
        raise self.retry(exc=exc)

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def index_knowledge_source_task(self, source_id: str):
    """
    ENHANCED: Index knowledge source with support for all file types and better error handling.
    FIXED: Now handles URL endpoint 404 errors specifically.
    """
    try:
        source = KnowledgeSource.objects.select_related('knowledge_base').get(id=source_id)
        kb = source.knowledge_base
        print(source)
        print("..........................................................")
        print("..........................................................")
        print(kb.id)
        print(kb.lyzr_rag_id)
        
        if not kb.lyzr_rag_id:
            logger.warning(f"RAG config ID missing for KB {kb.id}, retrying task for source {source_id}")
            raise self.retry(countdown=60)
            
    except KnowledgeSource.DoesNotExist:
        logger.error(f"KnowledgeSource {source_id} not found.")
        return

    # Update status to indexing
    source.status = KnowledgeSource.IndexingStatus.INDEXING
    source.save()
    
    client = LyzrClient()

    try:
        logger.info(f"Indexing source {source.id} of type {source.type} for RAG {kb.lyzr_rag_id}")
        
        if source.type == 'FILE':
            with source.file.open('rb') as f:
                client.index_file(kb.lyzr_rag_id, f, source.file.name)
        elif source.type == 'URL':
            # FIXED: Now uses correct endpoint internally
            client.index_url(kb.lyzr_rag_id, source.content)
        elif source.type == 'TEXT':
            client.index_text_content(kb.lyzr_rag_id, source.content, source.title)
        
        source.status = KnowledgeSource.IndexingStatus.COMPLETED
        source.save()
        logger.info(f"Successfully indexed source {source.id}")

    except LyzrAPIError as e:
        # Handle specific known errors
        error_text = str(e).lower()
        
        if "already exists" in error_text and "class name" in error_text:
            logger.warning(f"Ignoring known 'class name already exists' API error for source {source.id}.")
            source.status = KnowledgeSource.IndexingStatus.COMPLETED
            source.save()
            return
        elif "unsupported file type" in error_text:
            logger.error(f"Unsupported file type for source {source.id}: {e}")
            source.status = KnowledgeSource.IndexingStatus.FAILED
            source.save()
            return
        elif "invalid url" in error_text:
            logger.error(f"Invalid URL for source {source.id}: {e}")
            source.status = KnowledgeSource.IndexingStatus.FAILED
            source.save()
            return
        elif e.status_code == 404 and source.type == 'URL':
            # FIXED: Special handling for URL 404 errors
            logger.error(f"404 Error for URL source {source.id}: Website training endpoint not found or URL is invalid")
            logger.error(f"URL: {source.content}")
            logger.error(f"This might indicate:")
            logger.error(f"1. Wrong endpoint being used (should be v3/train/website/)")
            logger.error(f"2. Invalid URL format")
            logger.error(f"3. URL is not accessible")
            source.status = KnowledgeSource.IndexingStatus.FAILED
            source.save()
            return
        else:
            logger.error(f"Indexing failed for source {source.id}. Error: {e}")
            source.status = KnowledgeSource.IndexingStatus.FAILED
            source.save()
            if e.status_code not in [404, 422]:  # Don't retry client errors
                raise self.retry(exc=e)
                
    except Exception as exc:
        logger.error(f"Unexpected error indexing source {source.id}: {exc}")
        source.status = KnowledgeSource.IndexingStatus.FAILED
        source.save()
        raise self.retry(exc=exc)

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
        
        try:
            response = client.summarize_text(transcript)
            summary = response.get('summary')
            
            if summary:
                conversation.summary = summary
                conversation.save()
                logger.info(f"Successfully summarized conversation {conversation_id}")
        except LyzrAPIError as e:
            logger.error(f"Lyzr API error summarizing conversation {conversation_id}: {e}")
        
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
        
        if result['status'] == 'healthy':
            logger.info("Lyzr API health check passed")
        else:
            logger.error(f"Lyzr API health check failed: {result.get('error')}")
            
        return result
        
    except Exception as e:
        logger.error(f"Health check failed with exception: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": time.time()
        }

@shared_task
def retry_failed_knowledge_sources():
    """Retry failed knowledge source indexing."""
    failed_sources = KnowledgeSource.objects.filter(
        status=KnowledgeSource.IndexingStatus.FAILED
    )
    
    retry_count = 0
    for source in failed_sources:
        try:
            # Only retry if it's been more than 1 hour since last update
            if (timezone.now() - source.updated_at).seconds > 3600:
                logger.info(f"Retrying failed knowledge source {source.id}")
                index_knowledge_source_task.delay(source.id)
                retry_count += 1
        except Exception as e:
            logger.error(f"Error queuing retry for source {source.id}: {e}")
    
    logger.info(f"Queued {retry_count} failed knowledge sources for retry")
    return retry_count

@shared_task
def cleanup_old_conversations():
    """Clean up old conversations based on retention policy."""
    from django.utils import timezone
    from datetime import timedelta
    
    # Delete conversations older than 90 days with no activity
    cutoff_date = timezone.now() - timedelta(days=90)
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
    
    # Generate daily usage statistics
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
        'api_errors': 0  # Could be tracked with a separate model
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