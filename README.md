# Mindwell

Mindwell is a web app that asks people to play a short series of cognitive games and turns their performance into a **score out of 100**. The score places them in one of five categories:

**vulnerable · high risk · moderate risk · low risk · healthy**

It is designed for older adults and people affected by dementia: large text, high-contrast colours, big tap targets, gentle wording and no time pressure unless a game needs it.

> **This is a prototype and a screening indicator, not a medical diagnosis.**
> The scoring weights and category cut-offs are **placeholders** that have not been validated against clinical data. Do not use Mindwell to make health decisions or with real patients until the scoring has been calibrated and reviewed by a clinician.

---

## How it works

1. The person starts the test from the home page.
2. They play nine short games, one after another.
3. Each game reports raw metrics (levels reached, errors, counts, times) to the app.
4. At the end, the metrics are sent to the backend, which validates them, scores each game from 0 to 100, combines them with weights into one total, and maps the total to a category.
5. The result page shows the score, the category, a gentle explanation, a medical disclaimer and a short encouraging message.

### The games

| Game | What it roughly resembles | Scored |
|---|---|---|
| Pattern Recall | Visual-spatial working memory (repeat a growing sequence) | Yes |
| Memory Store | Shows 5 items to remember | No (supplies the items for Memory Recall) |
| Star Connect | Trail-making: attention and mental flexibility (1-A-2-B...) | Yes |
| Digit Span | Working memory, forward and backward | Yes |
| Block Builder | Visuospatial copying of a pattern | Yes |
| Target Tap | Sustained attention and impulse control | Yes |
| Word Storm | Verbal fluency (words starting with a letter) | Yes |
| Memory Recall | Delayed recall of the 5 items | Yes |
| Clock Master | Clock drawing: number placement and setting the time | Yes |

Reaction and completion times are stored for later analysis but are deliberately not scored (apart from one small speed term in Star Connect), because they depend heavily on age, device and motor ability.

---

## Tech stack

**Frontend** (`front-end/`)
- React with Vite
- Tailwind CSS v4 (via the `@tailwindcss/vite` plugin)
- React Router
- Fonts: Inter and Lora (Google Fonts)

**Backend** (`back-end/`)
- Python 3.11
- FastAPI, served with Uvicorn
- Pydantic v2 for request validation
- SQLAlchemy 2.0 with SQLite (PostgreSQL is a straightforward later switch via `DATABASE_URL`)

**Testing**
- pytest and httpx (backend scoring and API tests)

---

## Project structure

```
Mindwell/
├── back-end/
│   ├── main.py            # FastAPI app, CORS, health check, router registration
│   ├── config.py          # game weights and category thresholds (placeholders)
│   ├── database.py        # engine, session, get_db dependency
│   ├── models.py          # Participant and TestSession tables
│   ├── schemas.py         # Pydantic request/response models
│   ├── scoring.py         # raw metrics -> 0-100 score -> category
│   ├── routers/
│   │   ├── participants.py
│   │   └── sessions.py
│   ├── tests/             # scoring and API tests
│   ├── pytest.ini
│   ├── requirements.txt
│   └── requirements-dev.txt
├── front-end/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js     # React + Tailwind plugins, /api proxy to the backend
│   └── src/
│       ├── main.jsx
│       ├── App.jsx        # routes: /, /assessment, /results
│       ├── api.js         # the only file that talks to the backend
│       ├── index.css
│       ├── pages/         # Home, Assessment, Results
│       ├── games/         # one component per game + ordered list in index.js
│       ├── components/    # Button, GameShell, ProgressBar
│       ├── hooks/         # useSession (collects results, submits them)
│       ├── data/          # mentalHealthQuotes.js
│       ├── assets/        # home background image
│       └── utils/         # timing.js (timers, shuffle, stopwatch)
├── reference/
│   └── prototype.html     # the original single-file prototype
└── README.md
```

---

## Getting started

You need **Python 3.10+** and **Node.js 18+**. The commands below are for Windows PowerShell. You will need two terminals, one for each server.

### Backend

```powershell
cd back-end
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn main:app --reload
```

The API runs at http://localhost:8000 and the interactive docs are at http://localhost:8000/docs.

If PowerShell blocks the activation script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
On macOS or Linux, activate with `source venv/bin/activate` instead.

### Frontend

```powershell
cd front-end
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to the backend on port 8000, so both servers must be running.

To try it on a phone on the same Wi-Fi, run `npm run dev -- --host` and open the printed network URL.

### Tests

```powershell
cd back-end
pytest
```

---

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/participants` | Create an anonymous participant (`{"age": number or null}`) |
| GET | `/api/participants/{id}/sessions` | A participant's past sessions, newest first |
| POST | `/api/sessions` | Submit a finished test; returns score, category and per-game scores |
| GET | `/api/sessions/{id}` | Fetch one result |

A test needs at least 6 scoreable games to be scored. If a game fails or is skipped, the remaining weights are renormalised.

---

## Scoring (placeholder values)

Each game is converted to a 0-100 score, then combined with these weights (see `back-end/config.py`):

| Game | Weight |
|---|---|
| Memory Recall | 0.16 |
| Clock Master | 0.16 |
| Pattern Recall | 0.12 |
| Star Connect | 0.12 |
| Digit Span | 0.12 |
| Target Tap | 0.12 |
| Word Storm | 0.12 |
| Block Builder | 0.08 |

Category cut-offs on the 0-100 total: **80+ healthy, 65+ low risk, 50+ moderate risk, 35+ high risk, below 35 vulnerable.**

Every session stores the raw metrics and the `scoring_version`, so old sessions can be re-scored if the formula changes. All weights and thresholds live in `config.py` so they can be tuned in one place.

---

## Privacy

- Participants are identified only by an anonymous id and a short code (like `MW-4F7K`). The API rejects names or contact details.
- Deleting a participant deletes all of their sessions.
- The database file (`mindwell.db`) and `.env` files are git-ignored. Never commit real participant data.
- Authentication is not implemented yet, so anyone who knows a participant id can read that participant's history. Add authentication before any real-world use.

---

## Known limitations and roadmap

- Weights and category thresholds are unvalidated placeholders. The proper next step is a pilot study alongside a validated test (such as MoCA or MMSE), run with a clinician and with ethics approval and informed consent.
- No age or education adjustment in scoring.
- Word Storm does not check words against a dictionary and depends on typing ability. Voice input would help.
- Results are passed through router state, so refreshing the results page loses them.
- Possible additions: progress-over-time charts for repeat tests, a clinician/carer view with login, translations (Hindi, Kannada), PostgreSQL and HTTPS deployment, self-hosted fonts.

---

## Notes

- The home page background is a stock illustration. Check its licence before redistributing or deploying publicly.
- The messages on the results page (category explanations and quotes) are original text written for this app and have not been reviewed by a clinician.
