# TraceLens AI

**Deploying to Vercel? Start with [DEPLOYMENT.md](DEPLOYMENT.md).** This package deploys the frontend to Vercel and connects it to a separately hosted FastAPI backend with a persistent SQLite disk.

A local QA portfolio demo built with React, Vite, JavaScript, FastAPI and SQLite. Track requirements, link tests, record manual execution evidence, review verification gaps, inspect uploaded source text and export a current CSV report.

## Start on Windows

Requires Python 3.10+ and Node.js 20.19+ (or 22.12+).

From the project directory, install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm.cmd --prefix frontend install
```

Start the backend in one terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Start the frontend in a second terminal:

```powershell
npm.cmd --prefix frontend run dev
```

Open **http://127.0.0.1:5173**. Interactive API documentation is at **http://127.0.0.1:8000/docs**. Vite forwards `/api` requests to FastAPI; no separate CORS configuration is needed. On macOS/Linux use `.venv/bin/python` and `npm` in the same commands.

After installation, `powershell -ExecutionPolicy Bypass -File .\start.ps1` starts both servers together. Ctrl+C stops them. The policy option applies only to that process.

## Demo walkthrough

The first backend start creates Atlas Commerce with five requirements and four unexecuted test cases. No sample executions or successful outcomes are fabricated.

1. Review live dashboard metrics and open Evidence gaps.
2. Add/edit requirements with acceptance criteria and priority.
3. Create a linked test. Expand View details to inspect steps and expected results.
4. Actually execute a test yourself, then use Record result and document what happened. Passed and Failed require notes. Editing the test resets its result to Not Run.
5. Generate Test Suggestions, review a suggestion, edit it as needed, and save it manually.
6. Upload a small source file to Source evidence. Matches use words from requirement titles and display line excerpts. These do not confirm correctness. Uploaded code is never executed or security-scanned.
7. Open QA report and Export CSV. All metrics and findings are derived from the current database.

Projects can be created and deleted. Deleting a project removes its requirements, tests, source files and activity. Deleting a requirement removes its linked tests. Destructive actions require browser confirmation. Add fresh sample creates a separate sample project; delete an old sample to reset it without changing other projects.

## Analysis rules

- No linked tests: high-severity verification gap, not proof of a software defect.
- Any unexecuted linked test: medium-severity evidence gap.
- Any manually recorded failed test: high-severity finding.
- Missing Positive, Negative or Boundary categories: low-severity coverage-review heuristic. Not all categories apply to every requirement.

The findings count counts findings, not distinct requirements. Linked coverage counts requirements with at least one linked test, regardless of test result. Zero requirements displays 0% coverage. Findings are recalculated rather than persisted, so edits and deletions cannot leave stale findings in the database.

## Optional AI

The complete app works without an API key. Copy `backend/.env.example` to `backend/.env` and configure a provider that accepts a chat-completions-compatible JSON request:

```dotenv
LLM_API_URL=https://your-provider.example/v1/chat/completions
LLM_API_KEY=your-secret-key
LLM_MODEL=your-model-id
TRACELENS_DB=
```

The URL must be the full endpoint. The provider must support `messages`, `response_format: {"type":"json_object"}`, and a `choices[0].message.content` response. Restart the backend after changing configuration. Keys stay on the backend and are never sent to the browser. Clicking Generate Test Suggestions sends only the selected requirement to the configured provider, not uploaded source files.

Without configuration, suggestions are clearly labeled basic templates. Provider timeouts, errors and invalid responses fall back to those templates with an explicit failure label. Suggestions are never saved automatically and do not constitute test execution. Live provider integration needs your credentials and was not verified against a paid service.

## Persistence and files

The default database is `backend/tracelens.sqlite3`, independent of the working directory. An optional absolute `TRACELENS_DB` path changes it. SQLite stores source text, test evidence and activity along with project data. Stop the backend before copying the database for a backup. Environment files and databases are excluded from version control.

Uploads must be UTF-8 text, at most 100,000 bytes, with `.py`, `.js`, `.jsx`, `.ts`, `.tsx`, `.java` or `.txt` extensions. Binary, empty and oversized files are rejected. Filenames are not used as filesystem paths. CSV values are escaped to prevent spreadsheet formula interpretation.

This is a localhost demo without user authentication. Run on loopback as shown. Hosting Sites cannot run this Python/SQLite backend; deployment to a server would need both frontend routing and the Python process.

## Build and checks

```powershell
npm.cmd --prefix frontend run build
.\.venv\Scripts\python.exe -m pytest backend/test_api.py -q --basetemp .test-temp
```

API tests use an isolated database. They verify CRUD, result validation, live findings/statistics, CSV, upload validation, persistence across app lifecycles, cascaded deletion and provider-error fallback.

With both servers running and Microsoft Edge installed:

```powershell
cd frontend
npx.cmd playwright test
```

The browser test uses the initial sample project, creates and removes a separate test project, exercises requirement and test creation, requirement editing, a documented manual result, fallback suggestions, CSV download, deletion, unavailable-backend feedback and layouts at desktop and 390px mobile width. It writes screenshots under `artifacts/`. If the sample project was removed or changed, add a fresh sample and adjust the test fixture before running it.

## Troubleshooting

- **Backend unavailable:** start FastAPI on port 8000, then click Retry. Do not use JSON Server; it does not provide this API.
- **Port in use:** stop the old development process, or update the Vite proxy and backend port together.
- **PowerShell blocks npm.ps1:** use `npm.cmd` as above; no execution-policy change is needed.
- **Database cannot open:** ensure the configured directory exists and is writable. Leave `TRACELENS_DB` blank for the default.
- **No AI suggestions:** check provider URL, model and credentials. Basic templates remain available and are explicitly labeled.
- **Browser tests cannot launch:** install Edge or change `channel` in `frontend/playwright.config.js` to an installed Playwright browser.
- **pytest temp permissions:** use a fresh `--basetemp` path inside this project.

Structure: `backend/main.py` holds API routes, persistence and analysis; `frontend/src/main.jsx` holds the six-page UI; `frontend/src/style.css` provides responsive styling. No Docker, vector database, agent framework or external account is required.
