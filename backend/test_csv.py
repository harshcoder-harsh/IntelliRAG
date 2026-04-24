import traceback
from app.services.document_service import process_and_store_document

try:
    with open("backend/uploads/dummy.csv", "w") as f:
        f.write("id,name\n1,harsh\n2,vardhan\n")
    print("Processing dummy.csv...")
    process_and_store_document("backend/uploads/dummy.csv")
    print("Success!")
except Exception as e:
    traceback.print_exc()

