# Kayathri Tailor Billing App

This is a billing web app for Kayathri Tailor.

## Deployment on Netlify

1. Push this code to a GitHub repository.

2. Connect the repo to Netlify.

3. Set the build command to `python build.py` (already in netlify.toml).

4. Set the publish directory to `dist`.

5. Set environment variable `OWNER_PIN` to your desired PIN (default is 1234).

6. Deploy.

## Important Notes

- This app uses file-based storage for products and price history.
- On Netlify (serverless), file writes do not persist across function invocations.
- For production use, you need to replace the file storage with a database (e.g., SQLite with persistent storage or external DB like Supabase).
- Currently, the app will work for reading data, but saving changes will not persist.

## Alternative Hosting

For full functionality with persistent data, consider:
- Railway (supports Python, persistent storage)
- Render (supports Python, persistent storage)
- Heroku (supports Python)

## Local Development

Run `python app.py` and open http://localhost:5000.