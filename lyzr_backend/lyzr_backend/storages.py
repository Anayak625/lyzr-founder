from django.conf import settings
from storages.backends.azure_storage import AzureStorage

class PrivateAzureStorage(AzureStorage):
    """
    Custom Azure Storage backend that correctly initializes with settings
    and sets files to be private with expiring URLs.
    """
    account_name = settings.AZURE_ACCOUNT_NAME
    account_key = settings.AZURE_ACCOUNT_KEY
    azure_container = settings.AZURE_CONTAINER
    expiration_secs = 3600