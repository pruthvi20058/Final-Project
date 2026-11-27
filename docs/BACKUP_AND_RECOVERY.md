# MediAgent Backup and Recovery

This document describes the backup and restore system implemented in Task 10.

## Overview

MediAgent uses SQLite as its database. The backup system provides:

- Timestamped database backups
- Backup listing and management
- Restore from backup files
- Automated retention enforcement
- REST API for all operations (admin only)

## Backup Utility

Location: `server/utils/backup.js`

### Functions

| Function | Description |
|----------|-------------|
| `createBackup()` | Creates a timestamped copy of the SQLite database |
| `restoreFromBackup(path)` | Restores the database from a backup file |
| `listBackups()` | Lists all available backups sorted by newest first |
| `enforceRetention()` | Deletes backups older than the retention period |
| `runScheduledBackup()` | Runs backup + retention (for cron/scheduled use) |

### Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `BACKUP_DIR` | Directory for backup files | `server/backups` |
| `BACKUP_RETENTION_DAYS` | Days to retain backups | `30` |

### Backup Format

Backups are created using SQLite's `VACUUM INTO` command, which produces a
consistent, compact database file. If `VACUUM INTO` is not available, a
simple file copy is used as fallback.

Backup filename format: `mediagent-backup-YYYY-MM-DDTHH-MM-SSZ.db`

## API Endpoints

All endpoints require authentication and admin role.

### POST /api/backup/create

Creates a new database backup.

**Response:**
```json
{
  "success": true,
  "backup": {
    "success": true,
    "backupPath": "server/backups/mediagent-backup-2026-11-27T14-26-00Z.db",
    "fileSize": 4096,
    "recordCount": 150,
    "timestamp": "2026-11-27T14:26:00.000Z"
  },
  "correlationId": "req-abc123"
}
```

### GET /api/backup/list

Lists all available backups.

**Response:**
```json
{
  "success": true,
  "backups": [
    {
      "filename": "mediagent-backup-2026-11-27T14-26-00Z.db",
      "path": "server/backups/mediagent-backup-2026-11-27T14-26-00Z.db",
      "fileSize": 4096,
      "createdAt": "2026-11-27T14:26:00.000Z"
    }
  ],
  "count": 1,
  "correlationId": "req-abc123"
}
```

### POST /api/backup/restore

Restores the database from a backup file.

**Request:**
```json
{
  "backupFile": "server/backups/mediagent-backup-2026-11-27T14-26-00Z.db"
}
```

### POST /api/backup/retention

Enforces the retention policy, deleting expired backups.

### POST /api/backup/scheduled

Runs a scheduled backup with retention enforcement.

## Docker Volume Persistence

When deployed with Docker Compose, the `mediagent_data` volume persists:

```
/data/mediagent.db       — SQLite database
/data/uploads/           — Uploaded files
/data/backups/           — Backup files
```

## Recovery Procedures

### Scenario: Database Corruption

1. Stop the backend service
2. List available backups: `GET /api/backup/list`
3. Restore from the most recent good backup: `POST /api/backup/restore`
4. Restart the backend service

### Scenario: Accidental Data Deletion

1. Identify the time of deletion
2. Find a backup from before that time
3. Restore using `POST /api/backup/restore`

### Scenario: Complete Server Loss

1. Provision a new server
2. Deploy MediAgent (Docker or manual)
3. Copy backup files to `BACKUP_DIR`
4. Restore from backup: `POST /api/backup/restore`
5. Verify with `GET /api/health`

## Retention Policy

Backups are retained for `BACKUP_RETENTION_DAYS` (default 30 days).
Expired backups are automatically deleted when `enforceRetention()` is called.

For production, schedule `runScheduledBackup()` daily via cron or your
orchestrator's scheduled task system.

## What Is NOT Backed Up

- Uploaded files (in `UPLOAD_DIR`)
- Log files
- Environment variables
- Application source code

Uploaded files should be backed up separately if needed.

## Security

- Backup operations require admin authentication
- Backup files contain the full database including patient records
- Store backup directory outside the web root
- Consider encrypting backups at rest for production deployments
