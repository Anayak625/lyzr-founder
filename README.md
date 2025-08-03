# LyzrFoundry - Plug-and-Play AI Chatbot Platform

![LyzrFoundry Banner](github_resources/home.png)
[![Python](https://img.shields.io/badge/Python-3.13+-blue?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Celery](https://img.shields.io/badge/Celery-5.3-3781A6?logo=celery&logoColor=white)](https://docs.celeryq.dev/en/stable/)
[![Channels](https://img.shields.io/badge/Django%20Channels-5.0-A42722?logo=django&logoColor=white)](https://channels.readthedocs.io/en/latest/)

**LyzrFoundry** is a powerful, self-serve platform for building, training, and deploying AI-powered customer support chatbots. Inspired by services like Chatbase, it provides a seamless "plug-and-play" experience, allowing users to go from signup to a live chat widget on their website in minutes.

The platform is built with a robust backend using Django and a modern, responsive frontend using React, providing a complete solution for creating and managing intelligent Lyzr agents.

### 🚀 Deployment & Demo

**[Watch Demo on YouTube](https://youtu.be/f2Vd8sH0UeE?si=Qbej6OW1niTDsIKq)**
  
  [![YouTube](https://img.shields.io/badge/YouTube-Video-red?logo=youtube&logoColor=white)](https://youtu.be/f2Vd8sH0UeE?si=Qbej6OW1niTDsIKq)

**[Live Frontend on Vercel](https://lyzr-founder.vercel.app)**
  
  [![Vercel](https://img.shields.io/badge/Vercel-Frontend-000?logo=vercel&logoColor=white)](https://lyzr-founder.vercel.app)

**[Live Backend on Azure](https://lyzr-ai.azurewebsites.net)**
  
  [![Azure](https://img.shields.io/badge/Azure-Backend-0078D4?logo=microsoft-azure&logoColor=white)](https://lyzr-ai.azurewebsites.net)


## Features

| Feature Area                  | Status & Key Capabilities                                                                                                                              |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Agent Lifecycle Management**| ✅ **Complete**: Create, configure, test, and deploy AI agents. Full control over persona, goals, instructions, and LLM parameters.                     |
| **Knowledge Base Training**   | ✅ **Complete**: Asynchronously train agents via document uploads (`.pdf`, `.docx`, `.txt`) or website URL scraping.                                |
| **Live Chat & Deployment**    | ✅ **Complete**: Real-time chat playground for testing. A single `<script>` tag for embedding a customizable, conflict-free widget on any website.         |
| **Intelligent Ticketing**     | ✅ **Complete**: Proactive "Live Conversations" inbox. Manual & automatic ticket creation. AI-powered summarization of chats into ticket titles.       |
| **Team Collaboration**        | ✅ **Complete**: Invite members via email. Role-based access (Admin/Member). Assign tickets to specific teams and individuals.                        |
| **Billing & Subscriptions**   | ✅ **Complete**: Razorpay integration for subscriptions. Multi-tiered plans (Free, Pro). Automated enforcement of plan limits (agents, messages, etc.). |
| **Analytics & Insights**      | ✅ **Complete**: Dashboard with KPIs like total conversations, chat volume trends, and recent ticket activity.                                         |
| **Authentication**            | ✅ **Complete**: Secure JWT-based authentication with email/password and OTP verification for signups.                                                |


## Key Features in Detail

- **Self-Serve User Flow**: A complete onboarding process from user registration (with OTP) and login to agent creation.
- **Advanced Agent Tuning**: A dedicated UI to configure every aspect of the AI agent, including:
    - **Identity**: Name, description, and persona.
    - **Behavior**: Goals, step-by-step instructions, and few-shot examples.
    - **Model Configuration**: Choice of LLMs (GPT-4o Mini, GPT-4 Turbo, Gemini), temperature, and other advanced settings.
- **Knowledge Base Management**:
    - Easily train agents by uploading documents (`.pdf`, `.docx`, `.txt`) or scraping website content via URLs.
    - View the status of knowledge sources as they are indexed asynchronously by Celery.
- **"Live Conversations" Inbox**: Monitor all ongoing chats that have not yet become tickets, allowing support agents to proactively intervene and escalate if needed.
- **Intelligent Ticketing System**:
    - Users can trigger tickets via keywords (`agent`, `help`) or dedicated UI buttons.
    - Agents can manually create tickets from the "Live Conversations" inbox.
    - **AI-Powered Summarization**: Uses a dedicated Lyzr agent to automatically summarize chat transcripts into concise ticket titles.
    - View full conversation history directly within the ticket detail view—no context switching required.
    - Add internal notes, change status (New, Open, Solved, etc.), and set priority.
- **Full Team Collaboration Suite**:
    - Create teams and invite new members via email.
    - Manage member roles (Admin, Member).
    - Assign tickets to specific teams and individuals for clear ownership.
- **Subscription & Plan Enforcement**:
    - Tiered pricing plans (Free, Pro) managed in the database.
    - Full integration with Razorpay for handling subscriptions.
    - **Automated Limit Enforcement**: The backend actively prevents users from creating more resources (agents, team members, etc.) or sending messages beyond their current plan's limits.

## Architecture & Flow Diagrams

### 1. High-Level System Architecture
![High-Level System Design](github_resources/high-level.png)

### 2. Self-Serve User Flow
![User Flow](github_resources/user-flow.png)

### 3. Agent Training & Chat Flow (Async)
![Chat-Widget State](github_resources/chat-widget-state.png)
![Chat-Widget Architecture](github_resources/chat-widget-architecture.png)

## Tech Stack

| Category      | Technology                                                                                                                              |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**  | [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [@tanstack/react-query](https://tanstack.com/query/latest) |
| **Backend**   | [Python](https://www.python.org/), [Django](https://www.djangoproject.com/), [Django REST Framework](https://www.django-rest-framework.org/), [Django Channels](https://channels.readthedocs.io/), [Celery](https://docs.celeryq.dev/en/stable/) |
| **Database**  | [Azure Database for PostgreSQL](https://azure.microsoft.com/en-us/products/postgresql/)                                                               |
| **Cache/Broker**| [Azure Cache for Redis](https://azure.microsoft.com/en-us/products/redis-cache/)                                                                  |
| **Storage**   | [Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs)                                                                |
| **Deployment**| [Daphne](https://github.com/django/daphne), [Whitenoise](http://whitenoise.evans.io/en/stable/)                                                    |

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- PostgreSQL
- Redis
- An active Lyzr AI account with credentials.

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Anayak625/lyzr-founder.git
    cd lyzr-founder/lyzr-backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the `lyzr-backend` directory.
    ```env
    # Django
    SECRET_KEY=your-strong-secret-key
    DEBUG=True
    ALLOWED_HOSTS=127.0.0.1,localhost

    # Database 
    DATABASE_URL=postgres://user:password@host:port/dbname
    DB_SSL_REQUIRE=False # Usually False for local dev

    # Celery and Channels Broker URL using Redis
    CELERY_BROKER_URL=redis://localhost:6379/0
    CELERY_RESULT_BACKEND=redis://localhost:6379/0
    CHANNEL_LAYER_REDIS_URL=redis://localhost:6379/1

    # Azure Storage (Optional for local dev, but required for file uploads)
    AZURE_ACCOUNT_NAME=your-azure-storage-account-name
    AZURE_ACCOUNT_KEY=your-azure-storage-account-key
    AZURE_CONTAINER=lyzr-db

    # Lyzr API Credentials
    LYZR_API_KEY=your-lyzr-api-key
    LYZR_AGENT_API_BASE_URL=https://agent-prod.studio.lyzr.ai
    LYZR_RAG_API_BASE_URL=https://rag-prod.studio.lyzr.ai
    LYZR_LLM_CREDENTIAL_ID=your-lyzr-llm-credential-id
    LYZR_EMBEDDING_CREDENTIAL_ID=your-lyzr-embedding-credential-id
    LYZR_VECTOR_DB_CREDENTIAL_ID=your-lyzr-vector-db-credential-id
    LYZR_SUMMARIZER_AGENT_ID=your-dedicated-summarizer-agent-id
    LYZR_LLM_PROVIDER_ID="OpenAI"

    # Razorpay Credentials
    RAZORPAY_KEY_ID=your-razorpay-key-id
    RAZORPAY_KEY_SECRET=your-razorpay-key-secret
    RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret
    ```

5.  **Run database migrations:**
    ```bash
    python manage.py migrate
    ```

6.  **Run the backend services (requires 3 separate terminals):**

    -   **Terminal 1: Django Server (Daphne)**
        ```bash
        daphne -p 8000 lyzr_backend.asgi:application
        ```
    -   **Terminal 2: Celery Worker**
        ```bash
        celery -A lyzr_backend.celery worker -l info
        ```
    -   **Terminal 3: Celery Beat (Scheduler)**
        ```bash
        celery -A lyzr_backend.celery beat -l info
        ```

    The backend API will be available at `http://127.0.0.1:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    # From the root project directory
    cd frontend
    ```

2.  **Install JavaScript dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the `frontend` directory.
    ```env
    VITE_REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1
    VITE_APP_WS_URL=127.0.0.1:8000
    ```

4.  **Run the React development server (in a new terminal):**
    ```bash
    npm run dev
    ```
    The frontend application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Production Deployment

For a production environment (like Azure Web Apps), you would use a startup script to manage the processes.

**`startup.sh`**
```bash
#!/bin/bash
set -e

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Cleaning up old Celery Beat schedule..."
rm -f celerybeat-schedule

echo "Starting Celery worker in the background..."
celery -A lyzr_backend.celery worker -l info --pool=threads &

echo "Starting Celery Beat scheduler in the background..."
celery -A lyzr_backend.celery beat -l info &

echo "Starting Daphne server (in foreground)..."
exec daphne -b 0.0.0.0 -p 8000 lyzr_backend.asgi:application
```

## API Usage

A Postman collection is available in the repository:  
[`postman_api/v2/LyzrFoundry_v2.postman_environment.json`](postman_api/v2/LyzrFoundry_v2.postman_environment.json)

Import this collection into Postman to explore and test all available API endpoints.

### Key API Endpoints
-   `/api/v1/auth/` - User registration, OTP, and login.
-   `/api/v1/agents/` - Manage agents, including a status check at `/api/v1/agents/{id}/status/`.
-   `/api/v1/agents/{agent_pk}/knowledge-sources/` - Manage knowledge sources for an agent.
-   `/api/v1/tickets/` - List, create, and manage support tickets.
-   `/api/v1/conversations/` - List and retrieve details of non-ticketed chats.
-   `/api/v1/teams/` - List, create, and manage teams and members.
-   `/api/v1/invitations/` - View and respond to team invitations.
-   `/api/v1/billing/` - View plans and manage subscriptions.