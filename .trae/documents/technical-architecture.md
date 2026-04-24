## 1. Architecture Design
```mermaid
graph TD
    subgraph Frontend
        React["React + Vite"]
        Tailwind["Tailwind CSS"]
        Axios["Axios"]
    end
    subgraph Backend
        FastAPI["FastAPI"]
        LangChain["LangChain"]
        LLM["OpenAI / Local LLM"]
    end
    subgraph Data
        VectorDB["FAISS / ChromaDB"]
        SQLite["SQLite (Chat History)"]
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
- Frontend: React@18 + tailwindcss@3 + vite
- Backend: Python 3.11+, FastAPI, Uvicorn, LangChain, PyPDF, python-docx, BeautifulSoup4
- Data: FAISS (default), SQLite
- Initialization Tool: vite, pip

## 3. Route Definitions (Frontend)
| Route | Purpose |
|-------|---------|
| / | Main Chat & Upload Interface |

## 4. API Definitions
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload` | POST | Upload documents (PDF, DOCX, TXT) |
| `/api/chat` | POST | Send a query and get an AI response |
| `/api/history` | GET | Retrieve chat history |

## 5. Server Architecture Diagram
```mermaid
graph TD
    A["FastAPI Controller"] --> B["RAG Service"]
    B --> C["LangChain Agent"]
    B --> D["Vector Store"]
    A --> E["Database Service"]
    E --> F["SQLite DB"]
```

## 6. Data Model (if applicable)
### 6.1 Data Model Definition
```mermaid
erDiagram
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
```
