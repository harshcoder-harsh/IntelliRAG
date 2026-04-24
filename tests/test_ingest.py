import pytest
from src.ingest import split_documents
from langchain.schema import Document

def test_split_documents_creates_chunks():
    docs = [Document(page_content="A " * 1000, metadata={"source": "test.pdf"})]
    chunks = split_documents(docs)
    assert len(chunks) > 1

def test_chunk_size_respected():
    docs = [Document(page_content="word " * 2000, metadata={"source": "test.pdf"})]
    chunks = split_documents(docs)
    for chunk in chunks:
        assert len(chunk.page_content) <= 600  # some tolerance
