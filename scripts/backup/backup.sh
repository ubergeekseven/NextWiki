#!/bin/bash
# NextWiki Database Backup Script
# Run this script to create a backup of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="${DATA_PATH:-./data}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="nextwiki-backup-${TIMESTAMP}.sql.gz"

# Database connection details from environment
DB_HOST="postgres"
DB_NAME="${DB_NAME:-nextwiki}"
DB_USER="${DB_USER:-nextwiki}"

echo "🔄 Starting NextWiki database backup..."
echo "📁 Backup directory: ${BACKUP_DIR}"
echo "📄 Backup file: ${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create backup
echo "📦 Creating database backup..."
docker compose exec -T postgres pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully!"
    echo "📄 Backup saved to: ${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "📊 Backup size: ${BACKUP_SIZE}"
    
    # List recent backups
    echo ""
    echo "📋 Recent backups:"
    find "${BACKUP_DIR}" -name "nextwiki-backup-*.sql.gz" -mtime -7 -exec ls -lh {} \; | sort -k9
else
    echo "❌ Backup failed!"
    exit 1
fi