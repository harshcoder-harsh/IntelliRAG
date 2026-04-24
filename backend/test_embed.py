import time
from langchain_huggingface import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

chunks = ["This is a test chunk number " + str(i) for i in range(1000)]
print(f"Embedding {len(chunks)} chunks...")

start = time.time()
embedding_model.embed_documents(chunks)
end = time.time()

print(f"Embed {len(chunks)} chunks in {end - start:.2f} seconds")
