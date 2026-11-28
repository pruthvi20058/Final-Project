# MediAgent — Docker Deployment

**Date:** 2026-11-25  
**Status:** Dockerfiles and docker-compose.yml exist; runtime validation NOT PERFORMED in this environment

---

## 1. Docker Architecture

The project uses a multi-container Docker setup:

| Service | Dockerfile | Port | Purpose |
|---------|------------|------|---------|
| Frontend | `client/Dockerfile` | 80 | React app served via nginx |
| Backend | `server/Dockerfile` | 3001 | Express API server |

No separate ML service container — ML inference runs within the backend container using Python spawned processes.

---

## 2. Docker Compose

File: `docker-compose.yml`

Services:
- `frontend` — Vite-built React app, nginx-served
- `backend` — Express API with SQLite database

Volumes:
- `mediagent_data` — SQLite database persistence
- `mediagent_uploads` — Uploaded file persistence

Network: Default bridge network for inter-service communication.

---

## 3. Build and Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v
```

---

## 4. Configuration

Environment variables are passed via `.env` file at project root:

```bash
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

---

## 5. Health Checks

- Backend: HTTP GET to health/liveness endpoint
- Frontend: nginx health check

Health check endpoints are defined in the Dockerfiles and docker-compose.yml.

---

## 6. Non-Root Execution

Containers are configured to run as non-root where practical. Check individual Dockerfiles for USER directives.

---

## 7. Persistence

- SQLite database stored in Docker volume `mediagent_data`
- Uploaded files stored in Docker volume `mediagent_uploads`
- Container restart does NOT delete patient records (volumes persist)

**Critical:** Do NOT use ephemeral storage for SQLite database volumes. Patient records require durable storage.

---

## 8. Limitations

- Docker runtime validation NOT PERFORMED in this environment (no Docker daemon available)
- Multi-arch builds not tested
- Resource limits (CPU/memory) not configured
- No SSL termination in Docker (use reverse proxy in production)

---

## 9. Alternative: Single-Container Deployment

If Docker Compose is not suitable, the backend can be run directly on the host with the frontend served statically (Vercel, GitHub Pages, or nginx).
