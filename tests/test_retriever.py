import pytest
from unittest.mock import patch, MagicMock
from src.retriever import retrieve

def test_retrieve_returns_documents():
    mock_docs = [MagicMock(page_content="DBMS stands for Database Management System")]
    with patch("src.retriever.get_vectorstore") as mock_vs:
        mock_vs.return_value.similarity_search.return_value = mock_docs
        result = retrieve("What is DBMS?")
        assert len(result) == 1
