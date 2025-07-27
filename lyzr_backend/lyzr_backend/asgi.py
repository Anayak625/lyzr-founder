import os
import django
from channels.routing import get_default_application
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lyzr_backend.settings')

django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
import core.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(core.routing.websocket_urlpatterns),
})