import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PRODUCTS_FILE = BASE_DIR / "data" / "products.json"

def load_products():
    with open(PRODUCTS_FILE, encoding="utf-8") as f:
        return json.load(f)

def handler(event, context):
    try:
        products = load_products()
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(products)
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }