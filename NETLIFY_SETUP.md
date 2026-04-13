# Netlify Deployment Checklist

## Before Deploying

- [ ] Code is committed to GitHub
- [ ] `netlify.toml` is configured (already done)
- [ ] `build.py` script exists (already done)
- [ ] `data/` directory exists with initial JSON files

## Deployment Steps

### 1. Connect GitHub to Netlify
- Go to https://netlify.com
- Click "Add new site" → "Import an existing project"
- Select your GitHub repository

### 2. Configure Build Settings
- **Build command**: `python build.py` ✓ (already in netlify.toml)
- **Publish directory**: `dist` ✓ (already in netlify.toml)
- **Functions directory**: `netlify/functions` ✓ (already in netlify.toml)

### 3. Set Environment Variables (IMPORTANT!)
In Netlify site dashboard:
- Go to **Site settings → Build & deploy → Environment**
- Click **Edit variables**
- Add new variable:
  - **Key**: `OWNER_PIN`
  - **Value**: `1234` (or your custom PIN)
- **Save**

### 4. Deploy
- Click **Deploy** button
- Wait for build to complete (should show "Deployed successfully")
- Copy your site URL

## Testing After Deployment

1. Visit your Netlify site URL
2. Click the **"Price history"** button  
3. Enter PIN: **1234**
4. Click **"Load history"**
5. You should see a message: "Synced with server successfully!"

### If You See Error: "Wrong PIN"

**Check these:**
1. ✓ PIN in modal matches your `OWNER_PIN` env variable
2. ✓ Waited 2+ minutes after deploy (functions startup time)
3. ✓ Refreshed the browser page
4. ✓ Checked Netlify function logs

**To check function logs:**
- In Netlify dashboard, go to **Functions → products**
- Click **Function log** to see errors

## Notes

- **Default PIN**: 1234
- **Change PIN**: Update `OWNER_PIN` in Netlify environment variables (need to redeploy)
- **Local testing**: `python app.py` then visit `http://localhost:5000`

## Troubleshooting

### "Could not reach server"
- Wait 2-3 minutes for Netlify functions to initialize
- Check network tab (F12) to see actual API response

### "Wrong PIN"  
- Check you entered PIN correctly
- Verify `OWNER_PIN` is set in Netlify dashboard
- Redeploy after changing env var

### No data showing
- This is normal on first deploy - no bills/prices yet
- Prices and bills from this point onward will be tracked
- Try updating a price or printing a bill to test
