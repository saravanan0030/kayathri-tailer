# Kayathri Tailor Billing App

This is a billing web app for Kayathri Tailor.

## Deployment on Netlify

### Quick Start (Default PIN: 1234)

1. **Push your code to GitHub**
   - Create a GitHub repository and push this project

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repo
   - Netlify auto-detects the settings from `netlify.toml`

3. **Set Environment Variable (Important!)**
   - Go to **Site Settings → Build & Deploy → Environment**
   - Click "Edit variables"
   - Add: `OWNER_PIN = 1234` (or your desired 4-digit PIN)
   - **Default PIN if not set: 1234**

4. **Deploy**
   - Netlify auto-deploys. Wait for build to complete.

5. **Test the App**
   - Visit your site URL
   - Click "Price history" button
   - Enter PIN: **1234**
   - Click "Load history"

### Understanding the Error Message

If you see: **"Wrong PIN or could not reach server"**

Try these fixes:
1. **Check your PIN** - Make sure you entered it correctly (default: **1234**)
2. **Wrong PIN Format** - PIN must be exactly 4 digits
3. **Server not running** - On initial deploy, wait 1-2 minutes for functions to be ready
4. **Check environment variable** - In Netlify UI, verify OWNER_PIN is set correctly

## Important Notes About Netlify

⚠️ **Limitation: File Storage on Netlify**
- Netlify serverless functions **cannot persist file writes** reliably
- The app **reads** historical data fine (price history, bills)
- But **saving new prices/bills** won't persist across function invocations
- Previous price snapshots and bills will be visible but new changes won't stick

### For Production Use

To make saving work reliably, you need persistent storage:

**Option 1: Use a Different Host** (Recommended)
- Railway.app - Python with persistent storage
- Render.com - Python with persistent storage
- Heroku - Python apps
- PythonAnywhere - Python hosting

**Option 2: Add a Database** (Advanced)
- Supabase (PostgreSQL)
- Firebase
- MongoDB
- Amazon DynamoDB

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py

# Open browser
http://localhost:5000
```

## Architecture

- **Frontend**: HTML, CSS, JavaScript (vanilla, no frameworks)
- **Backend**: Flask (local) + Netlify Functions (serverless)
- **Storage**: JSON files (local) / Read-only on Netlify
- **Data Files**:
  - `data/products.json` - Product list
  - `data/price_history.json` - Price change history
  - `data/bills.json` - Printed bills history

## Changing the PIN

To change the owner PIN:

1. **For local development**: Edit `app.py` line 16 or set `OWNER_PIN` environment variable
2. **For Netlify**: Update the `OWNER_PIN` environment variable in Netlify UI (Site Settings → Build & Deploy → Environment)