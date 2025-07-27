# core/views.py
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from core.models import User
from .serializers import RegisterSerializer, UserSerializer
from .models import Agent
from .serializers import AgentSerializer


from .models import KnowledgeSource
from .serializers import KnowledgeSourceSerializer
from rest_framework import status, parsers

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    # You can customize the token payload here if needed
    pass

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    View to retrieve or update the authenticated user's details.
    This will be used for the onboarding step later.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    

# Agent Views
class AgentDetailView(generics.RetrieveUpdateAPIView):
    """
    View to retrieve or update the user's agent settings.
    Since a user has only one agent, we don't need a specific ID in the URL.
    """
    serializer_class = AgentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Attempt to get the agent for the user, or return None if it doesn't exist.
        try:
            return self.request.user.agent
        except Agent.DoesNotExist:
            return None

    def get(self, request, *args, **kwargs):
        agent = self.get_object()
        if agent is None:
            # Consistent with the React UI, return a 404 or empty response if no agent is set up.
            return Response(status=404)
        serializer = self.get_serializer(agent)
        return Response(serializer.data)

class AgentCreateView(generics.CreateAPIView):
    """
    View to create the first agent during the onboarding process.
    """
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer
    permission_classes = [permissions.IsAuthenticated]
    


# Knowledge Source Views
class KnowledgeSourceView(generics.ListCreateAPIView):
    serializer_class = KnowledgeSourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        return KnowledgeSource.objects.filter(agent=self.request.user.agent)

    def perform_create(self, serializer):
        serializer.save(agent=self.request.user.agent)
        
class KnowledgeSourceDetailView(generics.DestroyAPIView):
    serializer_class = KnowledgeSourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return KnowledgeSource.objects.filter(agent=self.request.user.agent)