import time
from langchain_community.document_loaders import TextLoader

# create 16mb file
with open("backend/uploads/test_16mb.txt", "w") as f:
    f.write("id,name,city,state,zip\n1,harsh,New York,NY,10001\n" * 400000)

start = time.time()
print("Loading with autodetect_encoding=True...")
loader = TextLoader("backend/uploads/test_16mb.txt", autodetect_encoding=True)
docs = loader.load()
end = time.time()

print(f"Loaded {len(docs)} docs in {end - start:.2f} seconds")
