#!/bin/bash
# NextWiki Database Restore Script
# Run this script to restore a backup of the PostgreSQL database

set -e

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "❌ Usage: $0 <backup-file>"
    echo "📋 Available backups:"
    find "${DATA_PATH:-./data}/backups" -name "nextwiki-backup-*.sql.gz" -exec basename {} \; | sort -r | head -10
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="${DATA_PATH:-./data}/backups"
FULL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Database connection details from environment
DB_HOST="postgres"
DB_NAME="${DB_NAME:-nextwiki}"
DB_USER="${DB_USER:-nextwiki}"

echo "🔄 Starting NextWiki database restore..."
echo "📁 Backup file: ${FULL_BACKUP_PATH}"

# Check if backup file exists
if [ ! -f "${FULL_BACKUP_PATH}" ]; then
    echo "❌ Backup file not found: ${FULL_BACKUP_PATH}"
    exit 1
fi

# Confirmation
echo "⚠️  WARNING: This will overwrite the current database!"
echo "📊 Database: ${DB_NAME}"
echo "🗂️  Backup: ${BACKUP_FILE}"
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🚫 Restore cancelled."
    exit 1
fi

# Stop the application to prevent conflicts
echo "⏸️  Stopping NextWiki application..."
docker compose stop nextwiki nextwiki-backend 2>/dev/null || true

# Drop and recreate database
echo "🗑️  Dropping existing database..."
docker compose exec -T postgres psql -h localhost -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker compose exec -T postgres psql -h localhost -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restore backup
echo "📦 Restoring database backup..."
gunzip -c "${FULL_BACKUP_PATH}" | docker compose exec -T postgres psql -h localhost -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Database restore completed successfully!"
    
    # Restart the application
    echo "▶️  Starting NextWiki application..."
    docker compose up -d nextwiki
    
    echo "🎉 NextWiki is now running with the restored database!"
else
    echo "❌ Database restore failed!"
    exit 1
fi