import streamlit as st
from src.chain import ask

st.set_page_config(page_title="College Assistant", page_icon="🎓", layout="centered")
st.title("College Knowledge Assistant")
st.caption("Ask me anything about your college — syllabus, timetable, fees, rules.")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if msg.get("sources"):
            with st.expander("Sources"):
                for src in msg["sources"]:
                    st.caption(f"- {src}")

# User input
if prompt := st.chat_input("Ask a question about your college..."):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Get answer
    with st.chat_message("assistant"):
        with st.spinner("Searching documents..."):
            result = ask(prompt)

        st.markdown(result["answer"])

        if result["sources"]:
            with st.expander("Sources"):
                for src in result["sources"]:
                    st.caption(f"- {src}")

    # Add assistant message to history
    st.session_state.messages.append({
        "role": "assistant",
        "content": result["answer"],
        "sources": result["sources"]
    })

# Sidebar
with st.sidebar:
    st.header("About")
    st.write("This assistant uses RAG (Retrieval Augmented Generation) to answer questions from your college documents.")
    if st.button("Clear Chat"):
        st.session_state.messages = []
        st.rerun()
