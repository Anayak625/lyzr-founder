from storages.backends.azure_storage import AzureStorage


class source_storage(AzureStorage):
    azure_container = 'lyzr-db'
    