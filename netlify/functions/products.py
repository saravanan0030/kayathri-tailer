import json
import os
from datetime import datetime, timedelta, timezone
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


def save_products_atomic(products):
    PRODUCTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = PRODUCTS_FILE.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(PRODUCTS_FILE)


def save_history_atomic(data):
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = HISTORY_FILE.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(HISTORY_FILE)


def prices_equal(p1, p2):
    if not isinstance(p1, dict) or not isinstance(p2, dict):
        return False
    if set(p1.keys()) != set(p2.keys()):
        return False
    for k in p1:
        try:
            a = round(float(p1[k]), 2)
            b = round(float(p2[k]), 2)
        except (TypeError, ValueError):
            return False
        if a != b:
            return False
    return True


def append_price_history(normalized_products):
    """Record a snapshot when prices differ from the latest entry; keep ~1 year."""
    now = datetime.now(timezone.utc)
    new_prices = {p["id"]: float(p["price"]) for p in normalized_products}
    new_names = {p["id"]: p["name"] for p in normalized_products}
    data = load_history()
    entries = data["entries"]
    if entries and prices_equal(entries[0].get("prices", {}), new_prices):
        return
    entry = {"ts": now.isoformat(), "prices": new_prices, "names": new_names}
    entries.insert(0, entry)
    cutoff = now - timedelta(days=HISTORY_RETAIN_DAYS)
    pruned = []
    for e in entries:
        try:
            t = datetime.fromisoformat(e.get("ts", "").replace("Z", "+00:00"))
            if t.tzinfo is None:
                t = t.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        if t >= cutoff:
            pruned.append(e)
    data["entries"] = pruned
    save_history_atomic(data)


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
            products = body.get("products")
            err = validate_products(products)
            if err:
                return make_response({"ok": False, "error": err}, 400)
            
            # Normalize products
            normalized = []
            for item in products:
                row = {
                    "id": str(item["id"]).strip(),
                    "name": str(item["name"]).strip(),
                    "price": float(item["price"]),
                    "unit": str(item.get("unit", "piece")).strip() or "piece",
                    "category": str(item.get("category", "Women")).strip() or "Women",
                    "image": str(item.get("image", "")).strip(),
                }
                if "name_ta" in item and item["name_ta"]:
                    row["name_ta"] = str(item["name_ta"]).strip()
                normalized.append(row)
            
            try:
                save_products_atomic(normalized)
                append_price_history(normalized)
            except OSError as e:
                return make_response({"ok": False, "error": str(e)}, 500)
            
            return make_response({"ok": True})

        try:
            return make_response(load_products())
        except Exception as e:
            return make_response({"ok": False, "error": str(e)}, 500)

    return make_response({"ok": False, "error": "Not found."}, 404)
