# MediAgent — Local Setup Guide

**Date:** 2026-11-25  
**Applies to:** Windows (PowerShell) and Linux (terminal)

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20.x | Required for frontend and backend |
| npm | Bundled with Node | Package manager |
| Python | 3.11+ | Required for ML, NLP, OCR services |
| pip | Bundled with Python | Python package manager |
| Git | 2.x | Version control |

---

## 2. Clone the Repository

```bash
git clone https://github.com/pruthvi20058/Final-Project.git
cd Final-Project
git checkout arena/370e8461-final-project
```

---

## 3. Environment Configuration

### Backend (.env)

Copy the example file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Backend server port | 3001 |
| NODE_ENV | Environment mode | development |
| HOST | Server bind address | 0.0.0.0 |
| DATABASE_PATH | SQLite database file path | server/mediagent.db |
| UPLOAD_DIR | Uploaded files directory | server/uploads |
| JWT_SECRET | Secret for JWT signing (min 32 chars) | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| JWT_EXPIRES_IN | Token expiry | 24h |
| CORS_ORIGIN | Frontend URL (comma-separated) | http://localhost:5173 |
| PYTHON_EXECUTABLE | Python binary path | python3 |
| ML_INFERENCE_TIMEOUT_MS | ML inference timeout | 7000 |
| LOG_LEVEL | Log level | info |
| BACKUP_DIR | Backup directory | server/backups |
| BACKUP_RETENTION_DAYS | Backup retention | 30 |

**Important:** Never commit `.env`. JWT_SECRET must be changed from the default for any non-development use.

### Frontend (.env)

```bash
cp client/.env.example client/.env
```

| Variable | Description |
|----------|-------------|
| VITE_API_URL | Backend API URL (e.g., http://localhost:3001/api) |

For local development, leave `VITE_API_URL` empty to use relative `/api` paths (Vite proxies to localhost:3001).

---

## 4. Backend Setup

### Install Dependencies

```bash
cd server
npm ci
```

### Python Dependencies

```bash
pip install -r requirements.txt
```

### Database Initialization

The database is initialized automatically on first server startup. The `seedData()` function creates schema and seed data. In production mode (`NODE_ENV=production`), no default doctor account is created — the first registration becomes the initial user.

### Start Backend

**Development (with auto-reload):**

```bash
cd server
npm run dev
```

**Production:**

```bash
cd server
npm start
```

Backend will be available at `http://localhost:3001`.

---

## 5. Frontend Setup

### Install Dependencies

```bash
cd client
npm ci
```

### Start Development Server

```bash
cd client
npm run dev
```

Frontend will be available at `http://localhost:5173`.

### Build for Production

```bash
cd client
npm run build
```

Output goes to `client/dist/`.

---

## 6. Verification

After both services are running:

1. Open `http://localhost:5173` in your browser
2. Register a new account (first account becomes the initial user in production)
3. Upload a laboratory report (PDF, JPG, PNG)
4. Navigate through the dashboard, predictions, and review workflows

### Run Tests

**Backend tests:**

```bash
cd server
npm test
```

**Frontend tests:**

```bash
cd client
npm run test
```

**All tests (CI-equivalent):**

```bash
cd server && npm test
cd ../client && npm run test
```

---

## 7. Windows-Specific Notes

- Use PowerShell (not CMD) for all commands
- `npm ci` works the same on Windows
- Python must be added to PATH during installation
- File paths in `.env` should use forward slashes or escaped backslashes
- `better-sqlite3` requires build tools: `npm install --global --production windows-build-tools`

---

## 8. Linux-Specific Notes

- Ensure `build-essential` is installed for native npm modules:
  ```bash
  sudo apt-get install build-essential
  ```
- `better-sqlite3` will build from source if no prebuilt binary is available
- Tesseract OCR may require system package:
  ```bash
  sudo apt-get install tesseract-ocr
  ```

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| `EBADENGINE: Node v22.x` | Warning only; tests run fine. Node 20.x recommended |
| `better-sqlite3` build fails | Install build tools (Windows: windows-build-tools; Linux: build-essential) |
| `sharp` postinstall fails | Rebuild: `cd server && npm rebuild sharp --build-from-source` |
| JWT_SECRET too short | Set JWT_SECRET to at least 32 characters in `.env` |
| Port 3001 already in use | Change PORT in `.env` or kill existing process |
| Python module not found | Run `pip install -r requirements.txt` in server directory |

---

## 10. Directory Structure

```
Final-Project/
├── .env.example              # Backend environment template
├── .gitignore                # Git ignore rules
├── docker-compose.yml        # Docker deployment
├── Dockerfile (server/)      # Backend container
├── Dockerfile (client/)      # Frontend container
├── package.json              # Root package.json
├── README.md                 # Project documentation
├── client/                   # React frontend (Vite)
├── server/                   # Express backend
│   ├── index.js              # Backend entry point
│   ├── db/database.js        # SQLite database
│   ├── middleware/           # Auth, RBAC, correlation
│   ├── routes/               # API route handlers
│   ├── services/             # Python and JS services
│   ├── agents/               # Agentic AI tools
│   ├── utils/                # Security utilities
│   ├── tests/                # Test suites
│   └── uploads/              # Uploaded files (gitignored)
├── docs/                     # Project documentation
├── eng.traineddata           # Tesseract English language data
└── uploads/                  # Root uploads (gitignored)
```
