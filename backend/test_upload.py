import requests

with open("test_spaces.py", "rb") as f:
    res = requests.post("http://localhost:8000/api/upload/", files={"files": f})
print(res.status_code)
print(res.text)
