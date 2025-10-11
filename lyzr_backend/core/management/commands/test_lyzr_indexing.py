"""
Django management command to diagnose Lyzr indexing issues.
Save this as: core/management/commands/test_lyzr_indexing.py

Usage: python manage.py test_lyzr_indexing
"""

from django.core.management.base import BaseCommand
from core.services.lyzr_client import LyzrClient
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Test different approaches to index content in Lyzr'

    def handle(self, *args, **options):
        client = LyzrClient()
        
        # Use an existing RAG ID from your logs
        test_rag_id = "68ea23832901b402c1e1d734"  # Replace with your actual RAG ID
        
        self.stdout.write(self.style.SUCCESS('=== Starting Lyzr Indexing Diagnostics ===\n'))
        
        # Test 1: Very simple content
        self.stdout.write(self.style.WARNING('Test 1: Simple one-line content'))
        simple_content = "This is a test document for the knowledge base."
        try:
            result = client.index_text_content(test_rag_id, simple_content, "Simple Test")
            self.stdout.write(f"Result: {result}")
            self.stdout.write(f"Document count: {result.get('document_count', 0)}\n")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}\n"))
        
        # Test 2: Multi-line structured content
        self.stdout.write(self.style.WARNING('Test 2: Multi-line structured content'))
        structured_content = """
Product Information
==================

Product Name: Test Product
Price: $99.99
Description: This is a test product for our knowledge base system.

Features:
- Feature 1: High quality
- Feature 2: Easy to use
- Feature 3: Affordable pricing

Support:
For support, please contact support@example.com
"""
        try:
            result = client.index_text_content(test_rag_id, structured_content, "Structured Test")
            self.stdout.write(f"Result: {result}")
            self.stdout.write(f"Document count: {result.get('document_count', 0)}\n")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}\n"))
        
        # Test 3: Check if RAG can be queried
        self.stdout.write(self.style.WARNING('Test 3: Query the RAG directly'))
        try:
            # Try to get RAG info
            import requests
            from django.conf import settings
            
            url = f"{settings.LYZR_RAG_API_BASE_URL}/v3/rag/{test_rag_id}"
            headers = {'x-api-key': settings.LYZR_API_KEY}
            response = requests.get(url, headers=headers)
            
            self.stdout.write(f"RAG Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                self.stdout.write(f"RAG Data: {data}\n")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error querying RAG: {e}\n"))
        
        # Test 4: Try different parsers
        self.stdout.write(self.style.WARNING('Test 4: Test with JSON endpoint instead'))
        json_content = '{"test": "data", "content": "This is test content for indexing"}'
        try:
            # Manually construct request
            import tempfile
            import os
            
            endpoint = f"v3/train/txt/?rag_id={test_rag_id}"
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                f.write(json_content)
                tmp_path = f.name
            
            try:
                with open(tmp_path, 'rb') as file_obj:
                    files = {'file': ('test.txt', file_obj, 'text/plain')}
                    # Try without data_parser
                    response = client._make_request(
                        client.rag_base_url, 
                        'POST', 
                        endpoint, 
                        files=files
                    )
                    self.stdout.write(f"Result without parser: {response}")
                    self.stdout.write(f"Document count: {response.get('document_count', 0)}\n")
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}\n"))
        
        # Test 5: Check PDF endpoint (if the txt endpoint is broken)
        self.stdout.write(self.style.WARNING('Test 5: Check if other endpoints work'))
        self.stdout.write("Note: This would require actual PDF file to test properly\n")
        
        self.stdout.write(self.style.SUCCESS('\n=== Diagnostics Complete ==='))
        self.stdout.write(self.style.WARNING("""
Recommendations based on results:
1. If ALL tests return document_count=0, this is likely a Lyzr API issue
2. Contact Lyzr support with your RAG ID and these test results
3. Ask them to check their indexing pipeline for this specific RAG
4. Request they verify the txt_parser is working correctly
        """))