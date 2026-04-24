## 1. Architecture Design
```mermaid
graph TD
    subgraph Frontend
        React["React + Vite"]
        Tailwind["Tailwind CSS"]
        Axios["Axios"]
        Router["React Router DOM"]
    end
    subgraph Backend
        FastAPI["FastAPI"]
        LangChain["LangChain"]
        LLM["OpenAI / Local LLM"]
    end
    subgraph Data
        VectorDB["FAISS / ChromaDB"]
        SQLite["SQLite (Chat History & Users)"]
        FileSystem["Local Uploads"]
    end
    React -->|REST API| FastAPI
    FastAPI --> LangChain
    LangChain --> LLM
    LangChain --> VectorDB
    FastAPI --> SQLite
    FastAPI --> FileSystem
```

## 2. Technology Description
- Frontend: React@18 + react-router-dom + tailwindcss@3 + vite + lucide-react + framer-motion (for glassmorphism animations)
- Backend: Python 3.11+, FastAPI, Uvicorn, LangChain, PyPDF, python-docx, BeautifulSoup4
- Data: FAISS (default), SQLite
- Initialization Tool: vite, pip

## 3. Route Definitions (Frontend)
| Route | Purpose |
|-------|---------|
| /signin | Sign In Page (Glassmorphism design) |
| /signup | Sign Up Page (Glassmorphism design) |
| / | Main Chat & Upload Interface |

## 4. API Definitions
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload` | POST | Upload documents (PDF, DOCX, TXT) |
| `/api/chat` | POST | Send a query and get an AI response |
| `/api/history` | GET | Retrieve chat history |
| `/api/auth/login` | POST | Authenticate user (Placeholder/Mock if no backend auth is fully built yet) |
| `/api/auth/register` | POST | Register user (Placeholder/Mock if no backend auth is fully built yet) |

## 5. Server Architecture Diagram
```mermaid
graph TD
    A["FastAPI Controller"] --> B["RAG Service"]
    A --> C["Auth Service"]
    B --> D["LangChain Agent"]
    B --> E["Vector Store"]
    A --> F["Database Service"]
    F --> G["SQLite DB"]
```

## 6. Data Model (if applicable)
### 6.1 Data Model Definition
```mermaid
erDiagram
    USER {
        string id
        string name
        string email
        string password_hash
    }
    DOCUMENT {
        string id
        string filename
        string file_type
        date uploaded_at
    }
    CHAT_HISTORY {
        string id
        string role
        string content
        date timestamp
    }
    USER ||--o{ DOCUMENT : uploads
    USER ||--o{ CHAT_HISTORY : owns
```
