# LyzrFoundry - Plug-and-Play AI Chatbot Platform

![LyzrFoundry Banner](github_resources/home.png)
[![Python](https://img.shields.io/badge/Python-3.13+-blue?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Celery](https://img.shields.io/badge/Celery-5.3-3781A6?logo=celery&logoColor=white)](https://docs.celeryq.dev/en/stable/)
[![Channels](https://img.shields.io/badge/Django%20Channels-5.0-A42722?logo=django&logoColor=white)](https://channels.readthedocs.io/en/latest/)

**LyzrFoundry** is a powerful, self-serve platform for building, training, and deploying AI-powered customer support chatbots. Inspired by services like chatbase.co, it provides a seamless "plug-and-play" experience, allowing users to go from signup to a live chat widget on their website in minutes.

The platform is built with a robust backend using Django and a modern, responsive frontend using React, providing a complete solution for creating and managing intelligent Lyzr agents.

### 🚀 Deployment & Demo

**[Watch Demo on YouTube](https://youtu.be/f2Vd8sH0UeE?si=Qbej6OW1niTDsIKq)**
  
  [![YouTube](https://img.shields.io/badge/YouTube-Video-red?logo=youtube&logoColor=white)](https://youtu.be/f2Vd8sH0UeE?si=Qbej6OW1niTDsIKq)

**[Live Frontend on Vercel](https://lyzr-founder.vercel.app)**
  
  [![Vercel](https://img.shields.io/badge/Vercel-Frontend-000?logo=vercel&logoColor=white)](https://lyze-founder.vercel.app)

**[Live Backend on Azure](https://lyzr-ai.azurewebsites.net)**
  
  [![Azure](https://img.shields.io/badge/Azure-Backend-0078D4?logo=microsoft-azure&logoColor=white)](https://lyzr-ai.azurewebsites.net)


## 🚧 TODO / Upcoming Features

These are planned enhancements that are modular and non-blocking to the core app experience:

- [x] ✅ Core Features
  - [x] Agent creation and configuration
  - [x] Chat widget embedding with plug-and-play setup
  - [x] Real-time chat UI with Lyzr agent
  - [x] Ticket management module
  - [x] Knowledge base upload and indexing
  - [x] Chat analytics and dashboard
  - [x] User authentication (email/password based)

- [x] 🔐 Authentication Enhancements
  - [x] OTP-based login (email/phone)

- [ ] 👥 Team Collaboration
  - [ ] Multiple teammates per account
  - [ ] Role-based access control (Admin, Agent, Viewer)

- [ ] 💳 Billing and Plans
  - [ ] Razorpay integration for paid plans
  - [ ] Usage-based metering
  - [ ] Subscription dashboard

- [ ] 📬 Notifications
  - [ ] Email notifications for new tickets
  - [ ] Web push notifications

- [ ] 🎯 Agent Optimization
  - [ ] Agent feedback loop based on ticket outcomes
  - [ ] Conversation quality metrics

---

**Note:** These features are structured as independent modules and will be rolled out in future iterations without affecting existing functionality.

## Core Features

- **Self-Serve User Flow**: A complete onboarding process from user registration and login to agent creation.
- **Advanced Agent Tuning**: A dedicated UI to configure every aspect of the AI agent, including:
    - **Identity**: Name, description, and persona.
    - **Behavior**: Goals, step-by-step instructions, and few-shot examples.
    - **Model Configuration**: Choice of LLMs (GPT-4o Mini, GPT-4 Turbo, Gemini), temperature, and other advanced settings.
- **Knowledge Base Management**:
    - Easily train agents by uploading documents (`.pdf`, `.docx`, `.txt`) or scraping website content via URLs.
    - View the status of knowledge sources as they are indexed asynchronously.
- **Real-time Chat Playground**: Test and interact with your configured agent in real-time within the app dashboard before deploying.
- **Plug-and-Play Website Widget**:
    - A single `<script>` tag to embed the chat widget on any website.
    - Style isolation using Shadow DOM to prevent CSS conflicts with the host page.
    - Customizable appearance (brand color, header text, welcome message).
- **Built-in Ticket Management**:
    - Automatically created tickets for conversations that are flagged for review.
    - View full conversation history.
    - Add internal notes for team collaboration.
    - Update ticket status (Active, Flagged, Resolved).
- **Analytics Dashboard**: Get insights into agent performance with KPIs like total conversations, resolution rate, and chat volume trends.
- **Asynchronous Processing**: Uses Celery and Redis for handling long-running tasks like agent creation and knowledge base indexing without blocking the UI.
- **Secure and Scalable**: Built with Django REST Framework, Simple-JWT for authentication, and Azure Blob Storage for secure file handling.

## Architecture & Flow Diagrams

### 1. High-Level System Architecture

This diagram shows the main components of the LyzrFoundry platform and how they interact.

![High-Level System Design](github_resources/high-level.png)

### 2. Self-Serve User Flow

This diagram illustrates the primary user journey, from signing up to deploying the widget.

![User Flow](github_resources/user-flow.png)

### 3. Agent Training & Chat Flow (Async)

This diagram details the asynchronous process of indexing a knowledge source and how a chat message is handled.

![Chat-Widget State](github_resources/chat-widget-state.png)
![Chat-Widget Architecture](github_resources/chat-widget-architecture.png)

## Tech Stack

| Category      | Technology                                                                                                                              |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**  | [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [@tanstack/react-query](https://tanstack.com/query/latest), [Axios](https://axios-http.com/), [React Router](https://reactrouter.com/) |
| **Backend**   | [Python](https://www.python.org/), [Django](https://www.djangoproject.com/), [Django REST Framework](https://www.django-rest-framework.org/), [Django Channels](https://channels.readthedocs.io/), [Celery](https://docs.celeryq.dev/en/stable/) |
| **Database**  | [Azure Database for PostgreSQL server](https://www.postgresql.org/)                                                                                               |
| **Cache/Broker**| [Azure Cache for Redis](https://redis.io/)                                                                                                                |
| **Storage**   | [Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs)                                                                |
| **Deployment**| Whitenoise, Daphne                                                                                                  |

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- PostgreSQL
- Redis
- An active Lyzr API account with credentials.

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Anayak625/lyzr-founder.git
    cd lyzr-founder
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install Python dependencies:**
    ```bash
    cd lyzr-backend
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the root directory and populate it with the following keys. Refer to `.env.example` if available.
    ```env
    # Django
    SECRET_KEY=your-strong-secret-key
    DEBUG=True
    ALLOWED_HOSTS=127.0.0.1,localhost

    # Database 
    DATABASE_URL=postgres://user:password@host:port/dbname
    DB_SSL_REQUIRE=True

    # Celery and Channels Broker URL using Redis
    CELERY_BROKER_URL=redis://localhost:6379/0
    CELERY_RESULT_BACKEND=redis://localhost:6379/0
    CHANNEL_LAYER_REDIS_URL=redis://localhost:6379/1

    # Azure Storage for file uploads
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
    LYZR_LLM_PROVIDER_ID="OpenAI"
    ```

5.  **Run database migrations:**
    ```bash
    daphne -p 8000 lyzr_backend.asgi:application
    ```

6.  **Create a superuser:**
    ```bash
    python manage.py createsuperuser
    ```

7.  **Run the Celery worker (in a separate terminal):**
    ```bash
    celery -A lyzr_backend.celery worker -l info
    ```

8.  **Run the Django development server (in another terminal):**
    The application uses Django Channels, so we run it with `daphne`.
    ```bash
    daphne -p 8000 lyzr_backend.asgi:application
    ```
    The backend API will be available at `http://127.0.0.1:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install JavaScript dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the `frontend` directory.
    ```env
    VITE_REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1
    VITE_APP_WS_URL=127.0.0.1:8000
    VITE_WIDGET_BASE_URL=http://localhost:8080 # Points to the dev server for the widget code
    ```

4.  **Run the React development server (in a new terminal):**
    ```bash
    npm run dev
    ```
    The frontend application will be available at `http://localhost:8080`.

## API Usage

A Postman collection is available in the `/postman` directory of this repository:  
[`postman_api/Lyzr_Django_API_Complete_Collection.json`](postman_api/Lyzr_Django_API_Complete_Collection.json)

You can import this collection into Postman to explore and test all available API endpoints.

1.  **Import**: Import the `LyzrFoundry.postman_collection.json` file into your Postman client.
2.  **Environment**: Set up a Postman environment with a variable `base_url` set to `http://127.0.0.1:8000/api/v1`.
3.  **Authentication**:
    - Use the `Auth > Login` request with your user credentials to get an `access` token.
    - Postman will automatically store this token. Subsequent requests are configured to use this Bearer Token for authorization.

### Key API Endpoints

-   `POST /api/v1/auth/register/` - Create a new user.
-   `POST /api/v1/auth/login/` - Authenticate and get JWT tokens.
-   `GET, POST /api/v1/agents/` - List or create agents.
-   `GET, PUT, PATCH, DELETE /api/v1/agents/{id}/` - Manage a specific agent.
-   `GET, POST /api/v1/agents/{agent_pk}/knowledge-sources/` - Manage knowledge sources for an agent.
-   `GET /api/v1/tickets/` - List all support tickets.
-   `GET /api/v1/tickets/{id}/` - Get details of a specific ticket.
-   `POST /api/v1/tickets/{id}/add_note/` - Add an internal note to a ticket.

## How The Website Widget Works

The embeddable widget is a key "plug-and-play" feature.

1.  **Loader Script**: A user places a simple `<script>` tag on their site. This script (`frontend/public/widget.js`) is a lightweight, vanilla JavaScript file.
2.  **Shadow DOM**: The loader script creates a `<div>` on the host page and attaches a **Shadow DOM**. This is crucial as it encapsulates all of the widget's styles and scripts, preventing any CSS from the host page from "leaking in" and breaking the widget's layout, and vice-versa.
3.  **Dynamic Loading**: The script then dynamically creates `<link>` and `<script>` tags *inside* the Shadow DOM to load the widget's main CSS and JavaScript application bundle (the compiled React app).
4.  **React Mount**: Once the widget's main script is loaded, it exposes a global function (`window.mountLyzrWidget`). The loader script calls this function, passing in the root element inside the Shadow DOM where the React application should be mounted.

This approach ensures maximum compatibility and zero interference with the customer's website.
