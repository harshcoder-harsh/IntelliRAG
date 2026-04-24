import argparse
from src.chain import ask

def main():
    parser = argparse.ArgumentParser(description="College RAG Assistant CLI")
    parser.add_argument("--query", "-q", type=str, required=True, help="Your question")
    args = parser.parse_args()

    print(f"\nQuestion: {args.query}\n")
    result = ask(args.query)
    print(f"Answer:\n{result['answer']}\n")
    if result["sources"]:
        print("Sources:")
        for s in result["sources"]:
            print(f"  - {s}")

if __name__ == "__main__":
    main()
