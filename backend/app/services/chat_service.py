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
            return ChatGroq(model_name="llama-3.1-8b-instant", temperature=0, groq_api_key=key)
        else:
            return ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0, openai_api_key=key)
    else:
        # Fallback or mock if no key
        return None

def generate_response(query: str, history: list, selected_file: str = None):
    # Pass filter to vector store if a specific file is selected
    filter_dict = {"source": selected_file} if selected_file else None
    
    # Retrieve a lower number of chunks to stay within Groq's free tier token limits (6000 TPM limit)
    docs = search_documents(query, k=4, filter=filter_dict)
    
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
        ("system", "You are an intelligent and thorough AI assistant. Your task is to provide extremely detailed, comprehensive answers based ONLY on the provided context.\n"
                   "Read the context carefully and extract every single detail, from big concepts to minor data points, related to the user's question.\n"
                   "Do not summarize too briefly. List out all relevant information found in the context. If the context does not contain the answer, explicitly state that.\n\nContext:\n{context}"),
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
