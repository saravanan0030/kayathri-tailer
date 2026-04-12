"""Kayathri Tailor — billing web app."""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
PRODUCTS_FILE = BASE_DIR / "data" / "products.json"
HISTORY_FILE = BASE_DIR / "data" / "price_history.json"
HISTORY_RETAIN_DAYS = 365

# Owner PIN for saving prices (change here or set env OWNER_PIN).
OWNER_PIN = os.environ.get("OWNER_PIN", "1234")

app = Flask(__name__)

REQUIRED_KEYS = ("id", "name", "price", "unit", "category", "image")


def load_products():
    with open(PRODUCTS_FILE, encoding="utf-8") as f:
        return json.load(f)


def validate_products(data):
    if not isinstance(data, list) or len(data) == 0:
        return "Price list must be a non-empty array."
    ids = set()
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            return f"Item {i + 1} is not an object."
        for k in REQUIRED_KEYS:
            if k not in item:
                return f"Item {i + 1} missing field: {k}"
        if item["id"] in ids:
            return f"Duplicate id: {item['id']}"
        ids.add(item["id"])
        try:
            price = float(item["price"])
        except (TypeError, ValueError):
            return f"Invalid price for {item.get('id')}"
        if price < 0 or price > 1_000_000:
            return f"Price out of range for {item['id']}"
        if not isinstance(item["name"], str) or not item["name"].strip():
            return f"Invalid name for {item['id']}"
    return None


def save_products_atomic(products):
    tmp = PRODUCTS_FILE.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(PRODUCTS_FILE)


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


def save_history_atomic(data):
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = HISTORY_FILE.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(HISTORY_FILE)


def _parse_ts(iso_s):
    s = iso_s.replace("Z", "+00:00") if isinstance(iso_s, str) else ""
    t = datetime.fromisoformat(s)
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone.utc)
    return t


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
            t = _parse_ts(e.get("ts", ""))
        except (ValueError, TypeError):
            continue
        if t >= cutoff:
            pruned.append(e)
    data["entries"] = pruned
    save_history_atomic(data)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/products")
def api_products():
    return jsonify(load_products())


@app.post("/api/products")
def api_save_products():
    body = request.get_json(silent=True) or {}
    pin = body.get("pin", "")
    if not isinstance(pin, str) or pin != OWNER_PIN:
        return jsonify({"ok": False, "error": "Wrong PIN. Try again."}), 403

    products = body.get("products")
    err = validate_products(products)
    if err:
        return jsonify({"ok": False, "error": err}), 400

    normalized = []
    for item in products:
        row = {
            "id": str(item["id"]).strip(),
            "name": str(item["name"]).strip(),
            "price": float(item["price"]),
            "unit": str(item["unit"]).strip() or "piece",
            "category": str(item["category"]).strip() or "Women",
            "image": str(item["image"]).strip(),
        }
        if "name_ta" in item and item["name_ta"]:
            row["name_ta"] = str(item["name_ta"]).strip()
        normalized.append(row)

    try:
        save_products_atomic(normalized)
        append_price_history(normalized)
    except OSError as e:
        return jsonify({"ok": False, "error": str(e)}), 500

    return jsonify({"ok": True})


@app.get("/api/price-history")
def api_price_history():
    pin = request.args.get("pin", "")
    if not isinstance(pin, str) or pin != OWNER_PIN:
        return jsonify({"ok": False, "error": "Wrong PIN."}), 403
    data = load_history()
    return jsonify({"ok": True, "entries": data.get("entries", []), "retain_days": HISTORY_RETAIN_DAYS})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
