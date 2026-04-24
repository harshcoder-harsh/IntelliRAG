from app.rag.vector_store import search_documents
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings

# In a real app, you might want to use a local LLM or configure this properly
def get_llm():
    key = settings.GROQ_API_KEY or settings.OPENAI_API_KEY
    if key:
        # Check if it's a groq key (usually starts with gsk_)
        if key.startswith("gsk_"):
            return ChatGroq(model_name="llama3-8b-8192", temperature=0, groq_api_key=key)
        else:
            return ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0, openai_api_key=key)
    else:
        # Fallback or mock if no key
        return None

def generate_response(query: str, history: list):
    docs = search_documents(query)
    
    if not docs:
        context = "No relevant context found in documents."
        citations = []
    else:
        context_parts = []
        citations_set = set()
        
        for idx, doc in enumerate(docs):
            source = doc.metadata.get("source", f"Document {idx+1}")
            context_parts.append(f"--- Source: {source} ---\n{doc.page_content}")
            citations_set.add(source)
            
        context = "\n\n".join(context_parts)
        citations = list(citations_set)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an intelligent AI assistant. Use the following retrieved context to answer the user's question. If you cannot answer based on the context, say so.\n\nContext:\n{context}"),
        ("human", "{query}")
    ])
    
    llm = get_llm()
    if llm is None:
        # Mock response for testing without API key
        answer = f"This is a mock response because OPENAI_API_KEY is not set.\n\nBased on your query '{query}', I found {len(docs)} relevant chunks.\n\nContext excerpt: {context[:100]}..."
        return answer, citations
    
    chain = prompt | llm
    response = chain.invoke({
        "context": context,
        "query": query
    })
    
    return response.content, citations
