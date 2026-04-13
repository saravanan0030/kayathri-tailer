import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PRODUCTS_FILE = BASE_DIR / "data" / "products.json"
HISTORY_FILE = BASE_DIR / "data" / "price_history.json"
HISTORY_RETAIN_DAYS = 365
OWNER_PIN = os.environ.get("OWNER_PIN", "1234")


def load_products():
    with open(PRODUCTS_FILE, encoding="utf-8") as f:
        return json.load(f)


def load_history():
    if not HISTORY_FILE.exists():
        return {"entries": []}
    with open(HISTORY_FILE, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        return {"entries": []}
    entries = data.get("entries")
    if not isinstance(entries, list):
        return {"entries": []}
    return {"entries": entries}


def validate_products(products):
    if not isinstance(products, list) or len(products) == 0:
        return "Price list must be a non-empty array."
    ids = set()
    for i, item in enumerate(products):
        if not isinstance(item, dict):
            return f"Item {i + 1} is not an object."
        if "id" not in item or "name" not in item or "price" not in item:
            return f"Item {i + 1} missing required fields."
        if item["id"] in ids:
            return f"Duplicate id: {item['id']}"
        ids.add(item["id"])
        try:
            price = float(item["price"])
        except (TypeError, ValueError):
            return f"Invalid price for {item.get('id', 'unknown')}"
        if price < 0 or price > 1_000_000:
            return f"Price out of range for {item['id']}"
    return None


def make_response(body, status=200):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def handler(event, context):
    path = event.get("path") or event.get("rawPath") or event.get("resource") or ""
    method = event.get("httpMethod", "GET")
    if not path:
        path = event.get("headers", {}).get("x-incoming-url", "")

    if path.endswith("/price-history"):
        params = event.get("queryStringParameters") or {}
        pin = params.get("pin", "")
        if pin != OWNER_PIN:
            return make_response({"ok": False, "error": "Wrong PIN."}, 403)
        data = load_history()
        return make_response({"ok": True, "entries": data.get("entries", []), "retain_days": HISTORY_RETAIN_DAYS})

    if path.endswith("/products"):
        if method == "POST":
            try:
                body = json.loads(event.get("body") or "{}")
            except Exception:
                body = {}
            pin = body.get("pin", "")
            if pin != OWNER_PIN:
                return make_response({"ok": False, "error": "Wrong PIN. Try again."}, 403)
            err = validate_products(body.get("products"))
            if err:
                return make_response({"ok": False, "error": err}, 400)
            return make_response({"ok": True})

        try:
            return make_response(load_products())
        except Exception as e:
            return make_response({"ok": False, "error": str(e)}, 500)

    return make_response({"ok": False, "error": "Not found."}, 404)
