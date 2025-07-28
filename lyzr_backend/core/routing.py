from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/chat/<uuid:agent_id>/<str:session_id>/', consumers.ChatConsumer.as_asgi()),
]