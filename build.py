import shutil
import os
from pathlib import Path

# Create dist directory
dist_dir = Path("dist")
dist_dir.mkdir(exist_ok=True)

# Copy static files
shutil.copytree("static", dist_dir / "static", dirs_exist_ok=True)

# Copy templates/index.html to dist/index.html
with open("templates/index.html", "r", encoding="utf-8") as src:
    html = src.read()
html = html.replace("{{ url_for('static', filename='css/style.css') }}", "/static/css/style.css")
html = html.replace("{{ url_for('static', filename='js/app.js') }}", "/static/js/app.js")
with open(dist_dir / "index.html", "w", encoding="utf-8") as dst:
    dst.write(html)

# Copy data files (static site can read local JSON directly)
shutil.copytree("data", dist_dir / "data", dirs_exist_ok=True)

print("Build complete")