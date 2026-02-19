# SUMMEREY-I (AI Study Summarizer)

A full-stack web application designed to help students and professionals quickly extract key insights from large PDF documents using AI. It features a personal archive, a guest mode with IP-based rate limiting, and "War Rooms" for collaborative studying.


![Landing Page](./assets/landing.png)
*Landing page with the custom Samurai-gold & Glassmorphism theme.*

![The Archive Dashboard](./assets/dashboard.png)
*Personal dashboard for uploading, managing, and summarizing scrolls.*

![War Room Collaboration](./assets/war_room.png)
*Collaborative War Rooms where users can share AI-generated insights.*

## ✨ Key Features

* **AI Summarization:** Integrates with Google Generative AI (Gemini) to process PDF text and generate concise, readable summaries.
* **Smart Guest Mode:** Unregistered users can test the app with a daily limit of 2 summaries, tracked securely via IP address to prevent abuse.
* **War Rooms (Groups):** Users can create private study groups, generate access codes, and share their summarized documents with classmates.
* **Role-Based Security:** Strict ownership checks. Only document owners can delete their files or remove them from shared War Rooms.
* **JWT Authentication:** Secure stateless authentication and session management.
* **Responsive Dark/Light UI:** Built with TailwindCSS, featuring a unique glassmorphism aesthetic and smooth Framer Motion animations.

## 🛠️ Tech Stack

**Frontend:**
* React.js (Vite)
* TailwindCSS
* Framer Motion
* Axios
* React Markdown

**Backend:**
* Python (FastAPI)
* PostgreSQL
* SQLAlchemy (ORM)
* PyJWT & Passlib (Security/Auth)
* Google Generative AI API

**Infrastructure:**
* Docker & Docker Compose (Database & Backend containerization)

## 🚀 Getting Started

If you want to run this project locally, follow these steps:

### Prerequisites
* Docker and Docker Compose installed
* Node.js installed
* A Google Gemini API Key

### 1. Clone the repository
```bash
git clone [https://github.com/adelinprelipcean/study-summarizer.git](https://github.com/adelinprelipcean/study-summarizer.git)
cd study-summarizer
```

### 2. Environment Variables
Navigate to the `backend` folder and create a `.env` file. You can use `.env.example` as a template:
```env
ENV=dev
DATABASE_URL=postgresql://admin:admin123@localhost:5435/study_summarizer_db
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=study_summarizer_db
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Start the Backend & Database (Docker)
Open a terminal in the root directory and run Docker Compose to build and start the containers:
``` bash
docker-compose up -d --build
```
The FastAPI backend will be available at http://127.0.0.1:8000 and the PostgreSQL database will run on port 5435.

### 4. Start the Frontend
Open a new terminal, navigate to the frontend folder, install the dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```
The React app will typically be available at http://localhost:5173.

## 🧠 What I Learned
Building this project was a great hands-on experience with full-stack development. Some of the key technical challenges I solved include:

State & Rate Limit Synchronization: Seamlessly syncing local React state with backend DB states.

API Architecture: Designing a clean RESTful API with FastAPI, properly structuring the Service and Repository layers.

Security & RBAC: Implementing strict Role-Based Access Control (RBAC) to ensure users can only modify or share their own data in collaborative environments.

Docker Orchestration: Managing containerized environments and ensuring persistent database volumes.

## 🎓 Acknowledgments

<p align="center">
  <img src="./assets/logo_usv.png" alt="USV Logo" height="70" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./assets/logo_assist.png" alt="ASSIST Academy Logo" height="70" />
</p>

This project was developed as part of the **DUAL-USV** educational program. The practical implementation and full-stack development phases were carried out under the guidance and framework of the **`<ASSIST Academy/>`**.

## 📄 License
This is a personal portfolio project.

