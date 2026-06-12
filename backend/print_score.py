import json
import os
import urllib.request
import urllib.error


def fetch_from_server(url: str, timeout: int = 2):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.load(resp)
    except (urllib.error.URLError, ValueError):
        return None


def read_offline(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def main():
    # Try server first
    server_url = "http://127.0.0.1:8000/scan/demo/secured"
    data = fetch_from_server(server_url)
    if data is None:
        # Fallback to repository file
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        candidate = os.path.join(repo_root, "secured.json")
        data = read_offline(candidate)

    if not data:
        print("No scan result found (server down and secured.json missing/invalid).")
        return 2

    score = data.get("safety_score")
    status = data.get("status")
    print(f"Safety score: {score}")
    print(f"Status: {status}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
