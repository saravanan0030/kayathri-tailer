import shutil
import os
from pathlib import Path

# Create dist directory
dist_dir = Path("dist")
dist_dir.mkdir(exist_ok=True)

# Copy static files
shutil.copytree("static", dist_dir / "static", dirs_exist_ok=True)

# Copy templates/index.html to dist/index.html
shutil.copy("templates/index.html", dist_dir / "index.html")

# Copy data files (though they won't persist in serverless)
shutil.copytree("data", dist_dir / "data", dirs_exist_ok=True)

print("Build complete")