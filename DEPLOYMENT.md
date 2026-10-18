# Deploy: Vercel frontend + hosted FastAPI backend

## Upload to GitHub

Extract this ZIP, then upload its **contents** to the root of a GitHub repository. Do not upload the ZIP itself: Vercel needs the extracted source files, including `vercel.json`, `frontend/` and `backend/`.

## 1. Host the backend

Use a Python host with a persistent writable disk. Deploy this repository and run from its root:

```sh
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port "$PORT"
```

Set `PORT` to the port supplied by your host (for a VPS, choose a port and configure an HTTPS reverse proxy).

Set backend environment variables:

- `TRACELENS_DB`: an absolute file path on the mounted persistent disk, for example `/data/tracelens.sqlite3`. The parent directory must exist and be writable. Do not use an ephemeral deployment filesystem.
- `CORS_ORIGINS`: your exact frontend origin, e.g. `https://your-project.vercel.app`. Multiple origins may be comma separated. Add your custom domain separately if used. Restart the backend after changes.
- Optional `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL`: configure only on the backend. They are not needed for the demo.

Use one backend instance with the mounted SQLite disk. Check `https://YOUR-BACKEND/api/projects` and `https://YOUR-BACKEND/docs` before connecting the frontend. The sample project is initialized on first startup. The ZIP deliberately contains no existing database, uploaded sources, test execution data or secrets.

This demo has no authentication: visitors share the same project data and can edit/delete it. CORS is a browser policy, not access control. Use sample data only for a public portfolio, or protect access through your hosting platform.

## 2. Import into Vercel

1. Import the GitHub repository.
2. Keep **Root Directory** at the repository root (`.`), not `frontend`.
3. Use framework preset **Other**. The included `vercel.json` defines installation, build and output settings.
4. Add `VITE_API_ORIGIN=https://YOUR-BACKEND` to the Vercel environment. Use the real HTTPS backend origin, without `/api` or a trailing path. This is a public URL, never an API key.
5. Deploy. Add the resulting Vercel domain to backend `CORS_ORIGINS` and restart the backend if it was not known earlier.

Set the variable in each Vercel environment you use. Changing it requires a frontend redeployment because Vite embeds it at build time. Preview deployments also need their exact origins allowed by the backend.

The build intentionally fails if Vercel's API origin is missing or invalid, rather than publishing a frontend that cannot access the backend. Vercel only hosts the static frontend; the Python backend is not deployed there.

## Verification

Verified locally before packaging: production build, four API test groups, desktop/mobile browser workflow, manual-result validation, CSV download, CRUD, upload validation, AI-unavailable fallback, and database persistence checks. The split-origin production build was tested against a separately running local FastAPI server with CORS enabled. No live Vercel deployment or external backend has been verified: those need your hosting URLs and configuration. No paid AI provider was tested.

After deployment: create a requirement and test, verify dashboard updates, export CSV, upload source text, then restart the backend and confirm the records persist. If the browser reports an unreachable backend, check its HTTPS URL, service availability, and `CORS_ORIGINS`.

References: [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [SQLite storage on Vercel](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel), [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/).
