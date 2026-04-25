from app.rag.vector_store import search_documents
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.tools import DuckDuckGoSearchResults
from app.config import settings

# In a real app, you might want to use a local LLM or configure this properly
def get_llm(streaming: bool = False):
    key = settings.GROQ_API_KEY or settings.OPENAI_API_KEY
    if key:
        # Check if it's a groq key (usually starts with gsk_)
        if key.startswith("gsk_"):
            return ChatGroq(model_name="llama-3.1-8b-instant", temperature=0, groq_api_key=key, streaming=streaming)
        else:
            return ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0, openai_api_key=key, streaming=streaming)
    else:
        # Fallback or mock if no key
        return None

def route_query(query: str, llm) -> str:
    router_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an intelligent router. Decide if the user's query should be answered using local uploaded documents ('DOCS') or a public web search ('WEB').\n"
                   "If the query asks for general knowledge, recent news, live information, or explicitly asks to search the web, output exactly 'WEB'.\n"
                   "If the query is about a specific document, report, or general analysis, output exactly 'DOCS'.\n"
                   "Reply with only one word: 'DOCS' or 'WEB'."),
        ("human", "{query}")
    ])
    try:
        chain = router_prompt | llm
        response = chain.invoke({"query": query})
        choice = response.content.strip().upper()
        return "WEB" if "WEB" in choice else "DOCS"
    except:
        return "DOCS"

def generate_response(query: str, history: list, selected_file: str = None, force_web_search: bool = False):
    docs = []
    citations = []
    
    if force_web_search:
        try:
            search = DuckDuckGoSearchResults()
            web_results = search.run(query)
            context = f"Web Search Results:\n{web_results}"
            system_prompt = (
                "You are an intelligent AI assistant. Answer the user's question using the provided web search results.\n"
                "If the results don't contain the exact answer, clearly state that, but still provide any related information.\n\n"
                "Context:\n{context}"
            )
            citations = ["Web Search"]
        except Exception as e:
            context = f"Web search failed: {e}"
            system_prompt = "You are an intelligent AI assistant. Answer the user's question using your general knowledge."
    else:
        filter_dict = {"source": selected_file} if selected_file else None
        docs = search_documents(query, k=2, filter=filter_dict)
        
        context_parts = []
        citations_set = set()
        
        if not docs:
            context = "No relevant context found in documents."
        else:
            for idx, doc in enumerate(docs):
                source = doc.metadata.get("source", f"Document {idx+1}")
                context_parts.append(f"--- Source: {source} ---\n{doc.page_content}")
                citations_set.add(source)
                
            context = "\n\n".join(context_parts)
            citations = list(citations_set)
        
        system_prompt = (
            "You are an intelligent and helpful AI assistant. Your task is to answer the user's question using the provided context from their documents.\n"
            "If the user asks for a general explanation, summary, or overview, synthesize all the provided context chunks into a comprehensive, detailed response.\n"
            "Extract as much relevant detail as possible. If the context does not contain the exact answer, clearly state that, but still provide any related information found in the context.\n\n"
            "Context:\n{context}"
        )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{query}")
    ])
    
    llm = get_llm(streaming=False)
    if llm is None:
        answer = f"This is a mock response because OPENAI_API_KEY is not set.\n\nBased on your query '{query}', I found {len(docs)} relevant chunks.\n\nContext excerpt: {context[:100]}..."
        return answer, citations
    
    chain = prompt | llm
    response = chain.invoke({
        "context": context,
        "query": query
    })
    
    return response.content, citations

async def generate_response_stream(query: str, history: list, selected_file: str = None, force_web_search: bool = False):
    llm = get_llm(streaming=True)
    if llm is None:
        yield "This is a mock response because OPENAI_API_KEY is not set.\n\n"
        return

    docs = []
    
    if force_web_search:
        yield "*Searching the web...*\n\n"
        try:
            search = DuckDuckGoSearchResults()
            web_results = search.run(query)
            context = f"Web Search Results:\n{web_results}"
            system_prompt = (
                "You are an intelligent AI assistant. Answer the user's question using the provided web search results.\n"
                "If the results don't contain the exact answer, clearly state that, but still provide any related information.\n\n"
                "Context:\n{context}"
            )
        except Exception as e:
            context = f"Web search failed: {e}"
            system_prompt = "You are an intelligent AI assistant. Answer the user's question using your general knowledge."
            
    else:
        filter_dict = {"source": selected_file} if selected_file else None
        docs = search_documents(query, k=2, filter=filter_dict)
        
        if not docs:
            context = "No relevant context found in documents."
        else:
            context = "\n\n".join([f"Document: {d.metadata.get('source', 'Unknown')}\nContent: {d.page_content}" for d in docs])
            
        system_prompt = (
            "You are an intelligent and helpful AI assistant. Your task is to answer the user's question using the provided context from their documents.\n"
            "If the user asks for a general explanation, summary, or overview, synthesize all the provided context chunks into a comprehensive, detailed response.\n"
            "Extract as much relevant detail as possible. If the context does not contain the exact answer, clearly state that, but still provide any related information found in the context.\n\n"
            "Context:\n{context}"
        )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{query}")
    ])
    
    chain = prompt | llm
    
    try:
        async for chunk in chain.astream({"context": context, "query": query}):
            yield chunk.content
    except Exception as e:
        yield f"\n\n[Error generating response: {str(e)}]"

def generate_summary_for_file(filename: str):
    docs = search_documents("overview summary introduction main points", k=2, filter={"source": filename})
    if not docs:
        return "No content available to summarize."
        
    context = "\n\n".join([d.page_content for d in docs])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an AI assistant. Provide a concise, 2-3 sentence summary of the document based on the following excerpts.\n\nContext:\n{context}"),
        ("human", "Summarize the document '{filename}'")
    ])
    
    llm = get_llm(streaming=False)
    if llm is None:
        return "Summary not available (No API key)."
        
    chain = prompt | llm
    try:
        response = chain.invoke({"context": context, "filename": filename})
        return response.content
    except Exception as e:
        return f"Error generating summary: {str(e)}"

async def generate_compare_stream(file1: str, file2: str, query: str):
    docs1 = search_documents(query, k=2, filter={"source": file1})
    docs2 = search_documents(query, k=2, filter={"source": file2})
    
    context = f"--- Document A ({file1}) ---\n"
    context += "\n".join([d.page_content for d in docs1])
    context += f"\n\n--- Document B ({file2}) ---\n"
    context += "\n".join([d.page_content for d in docs2])
    
    llm = get_llm(streaming=True)
    if llm is None:
        yield "API key not configured."
        return

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an intelligent AI assistant. Compare the two provided documents based on the given context. Address their similarities, differences, and main themes.\n\nContext:\n{context}"),
        ("human", "{query}")
    ])

    chain = prompt | llm
    
    try:
        async for chunk in chain.astream({"context": context, "query": query}):
            yield chunk.content
    except Exception as e:
        yield f"\n\n[Error during comparison: {str(e)}]"
