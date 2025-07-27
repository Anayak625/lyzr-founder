# LyzrFoundry: AI Support That Builds Your Business

**LyzrFoundry isn't just a chatbot. It's an intelligent support and analytics platform designed for founders. It reduces your support workload while transforming customer questions into actionable data for growth.**

---

### **Table of Contents**
- [**Live Demo & Video Walkthrough**](#live-demo--video-walkthrough)
- [**The Vision: More Than Just a Chatbot**](#the-vision-more-than-just-a-chatbot)
- [**Strategic Features for the Founder**](#strategic-features-for-the-founder-the-wow-factor)
    - [1. Analytics Dashboard: Turn Questions into Insights](#1-analytics-dashboard-turn-questions-into-insights)
    - [2. Seamless Onboarding: To Sign-up](#2-seamless-onboarding-from-sign-up-to-aha-in-60-seconds)
    - [3. Proactive Tuning: A Self-Improving AI](#3-proactive-tuning-a-self-improving-ai)
    - [4. Cost & Usage Tracking: Manage Your Burn Rate](#4-cost--usage-tracking-manage-your-burn-rate)
- [**Core Functionality**](#core-functionality)
- [**Technology Stack & Architecture**](#technology-stack--architecture)
- [**Getting Started (Local Setup)**](#getting-started-local-setup)
- [**Project Structure**](#project-structure)


## **Live Demo & Video Walkthrough**

[](https://your-live-demo-url.com)
*<p align="center">Click the image above for a live demo of the deployed application.</p>*

### **2-Minute Founder Walkthrough (Loom Video)**

Watch this short video to see how LyzrFoundry takes a user from sign-up to a fully operational, insight-generating support agent on their website in under two minutes.

**(Link to your 2-3 minute Loom video here)**

---

## **The Vision: More Than Just a Chatbot**

Every founder cares about three things: **Growth, Data, and Efficiency.** This project was built from the ground up to serve those needs.

Standard customer support tools are reactive. They help you answer questions. LyzrFoundry is proactive. It's designed to *eliminate* questions by telling you what your customers are confused about, what information is missing from your website, and how to improve your product.

It achieves this by providing a plug-and-play AI support agent powered by Lyzr, and then layering a powerful business intelligence dashboard on top.

---

## **Strategic Features for the Founder (The "Wow" Factor)**

This is what makes LyzrFoundry different. These features were designed to provide direct business value, not just technical functionality.

### **1. Analytics Dashboard: Turn Questions into Insights**
Instead of a simple ticket list, we provide a dashboard that helps you understand your customers and business health at a glance.

*   **Key Metrics:** Instantly see your `Total Chats`, `New Tickets`, and your AI's `Resolution Rate`.
*   **Most Frequent Questions:** A continuously updated list of what your customers are asking most often. This is a goldmine for identifying gaps in your documentation or website copy.
*   **Trend Visualization:** Simple charts show chat and ticket volume over time, helping you spot trends and understand customer engagement.

> **Business Value:** This transforms customer support from a cost center into a strategic intelligence hub. You get the data you need to proactively improve your business and reduce your long-term support burden.

### **2. Seamless Onboarding: From Sign-up to "Aha!" in 60 Seconds**
We believe a user who gets value fast is a user who stays. We've obsessed over making the path to the "Aha!" moment as short as possible.

*   **Guided Tour:** A simple, step-by-step modal flow guides new users to create their first agent immediately after sign-up.
*   **The "Magic Snippet":** After creation, the user is presented with one line of code. They are shown exactly where to paste it on their website to go live.
*   **Zero Friction:** We remove all guesswork and don't dump users on a blank dashboard.

> **Business Value:** This focus on UX directly increases the user activation rate, a critical metric for growth and user retention. It shows an understanding of product-led growth.

### **3. Proactive Tuning: A Self-Improving AI**
An agent that can't answer a question is a frustration for the customer and a new ticket for you. We built a data-driven feedback loop to solve this.

*   **Feedback Mechanism:** A simple "👍 / 👎" button appears after each AI response in the chat widget.
*   **Automated Analysis:** When a user clicks "👎", we log the question. Our backend analyzes these failures to find patterns.
*   **Actionable Suggestions:** The dashboard presents clear, data-backed advice like: *"Your agent frequently fails to answer questions about 'refunds'. Consider adding your refund policy to its knowledge base."*

> **Business Value:** This creates a self-improving system that increases the agent's effectiveness over time, directly reducing the number of escalated tickets and improving customer satisfaction without manual effort.

### **4. Cost & Usage Tracking: Manage Your Burn Rate**
Every API call has a cost. Founders need to see and manage their expenses.

*   **Usage Meter:** The dashboard clearly displays how many Lyzr API queries have been used against a monthly free tier (e.g., *"412 / 1,000 free monthly queries"*).
*   **Backend Logging:** Every API call to the Lyzr service is logged and attributed to the correct user account.

> **Business Value:** This shows commercial awareness. It provides cost transparency and builds the foundation for a sustainable, tiered SaaS pricing model.

---

## **Core Functionality**

✔️ **Plug-and-Play Chat Widget:** A single line of code adds the chat widget to any website.
✔️ **Self-Serve Agent Creation:** Users can create and configure support agents without touching the Lyzr Studio backend.
✔️ **User Management:** Secure user sign-up, login, and profile management.
✔️ **Ticket Management:** A clean UI for viewing and managing conversations that require human attention.

---

## **Technology Stack & Architecture**

We chose a modern, decoupled architecture for scalability, security, and maintainability.

*   **Frontend:** **ReactJS** (with Recharts for visualizations). Deployed on **Azure Static Web Apps** for fast, global delivery.
*   **Backend:** **Django & Django REST Framework**. A robust and secure API for handling business logic. Deployed on **Azure App Service** for scalable performance.
*   **Database:** **PostgreSQL on Azure**. A powerful, open-source relational database.
*   **AI Engine:** **Lyzr Agents API**. The core intelligence powering the chat functionality.

*Architecture Diagram:*
```
[User's Website] <--> [React Chat Widget]
       |
[User on a Browser] <--> [React App on Azure SWA] <--> [Django REST API on Azure App Service] <--> [PostgreSQL on Azure]
                                                                        |
                                                                   [Lyzr API]
```
> **Why this stack?** Django's "batteries-included" philosophy accelerated the development of user and ticket management. React provides a modern, interactive user experience. Decoupling them and hosting on Azure provides a professional-grade, scalable foundation fit for a real-world SaaS product.

---

## **Getting Started (Local Setup)**

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### **Prerequisites**
*   Python 3.9+
*   Node.js v16+ & npm
*   Git

### **1. Backend Setup (Django)**
```bash
# Clone the repository
git clone https://github.com/your-username/lyzr-foundry.git
cd lyzr-foundry/backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Create a .env file and add your secret keys
# (copy .env.example to .env and fill in the values)
# SECRET_KEY=your-django-secret-key
# DATABASE_URL=your-local-postgres-url
# LYZR_API_KEY=your-lyzr-api-key

# Run database migrations
python manage.py migrate

# Run the development server
python manage.py runserver
# The backend will be available at http://127.0.0.1:8000
```

### **2. Frontend Setup (React)**
```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Create a .env.local file and add the API URL
# REACT_APP_API_URL=http://127.0.0.1:8000

# Start the React development server
npm start
# The frontend will be available at http://localhost:3000
```

---

## **Project Structure**
The project is organized into two main directories: `backend` and `frontend`, maintaining a clean separation of concerns.

```
/
├── backend/            # Django REST Framework application
│   ├── api/            # Core API logic, views, serializers
│   ├── tickets/        # Django app for ticket management
│   ├── users/          # Django app for user management
│   └── manage.py
├── frontend/           # React application
│   ├── public/
│   └── src/
│       ├── components/ # Reusable React components (Dashboard, ChatWidget, etc.)
│       ├── pages/      # Main pages (Login, Dashboard, etc.)
│       ├── services/   # API call functions
│       └── App.js
└── README.md
```