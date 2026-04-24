import time
from langchain_text_splitters import RecursiveCharacterTextSplitter

text = "id,name,city,state,zip\n1,harsh,New York,NY,10001\n" * 400000  # ~16MB

print(f"Text length: {len(text)}")

start = time.time()
splitter = RecursiveCharacterTextSplitter(chunk_size=2500, chunk_overlap=250)
chunks = splitter.split_text(text)
end = time.time()

print(f"Split {len(chunks)} chunks in {end - start:.2f} seconds")
