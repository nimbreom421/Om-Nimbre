# Gemini Advanced AI Chatbot - Python & MySQL Backend

This directory contains the production-grade standalone **Python (FastAPI)** backend with **MySQL** database integration and the official **Google GenAI** SDK.

## Architecture

- **Web Framework**: FastAPI (Async, high-speed OpenAPI specification)
- **Database**: MySQL 8.0 with SQLAlchemy ORM + PyMySQL connector
- **Authentication**: JWT (JSON Web Tokens) with PBKDF2/Bcrypt password hashing
- **AI Engine**: Google GenAI SDK (`gemini-3.8-flash`)

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Set the following environment variables or add them to `.env`:
```env
GEMINI_API_KEY="your-gemini-api-key"
MYSQL_USER="gemini_user"
MYSQL_PASSWORD="gemini_secret_2026"
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_DB="gemini_chatbot_db"
JWT_SECRET="your-jwt-secret-key"
```

### 3. Initialize MySQL Database
```bash
mysql -u root -p < database.sql
```

### 4. Start the FastAPI Server
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at `http://localhost:8000/docs`.
