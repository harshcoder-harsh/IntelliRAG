import pytest
from unittest.mock import patch, MagicMock
from src.chain import ask

def test_ask_returns_answer_and_sources():
    with patch("src.chain.get_rag_chain") as mock_chain:
        mock_chain.return_value.invoke.return_value = {
            "result": "The exam is in December.",
            "source_documents": [MagicMock(metadata={"source": "timetable.pdf"})]
        }
        result = ask("When is the exam?")
        assert "answer" in result
        assert "sources" in result
        assert result["answer"] == "The exam is in December."
