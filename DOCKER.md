# NextWiki Docker Deployment Guide

This guide explains how to deploy NextWiki using Docker and Docker Compose with external volumes for easy backup and transport.

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ubergeekseven/NextWiki.git
   cd NextWiki
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.docker .env
   # Edit .env with your settings
   ```

3. **Start NextWiki:**
   ```bash
   docker compose up -d
   ```

4. **Access NextWiki:**
   - Web app: http://localhost:3000
   - Backend (if enabled): http://localhost:3001

## Configuration

### Environment Variables

Copy `.env.docker` to `.env` and configure:

- **DATA_PATH**: Where to store all data (default: `./data`)
- **Database credentials**: Change default passwords
- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
- **OAuth providers**: Configure GitHub/Google OAuth

### External Data Volumes

All persistent data is stored in the `DATA_PATH` directory:

```
./data/
├── postgres/          # PostgreSQL data
├── postgres-config/   # PostgreSQL configuration
├── backups/           # Database backups
└── app-data/          # Application data
```

You can change the data location by setting `DATA_PATH`:
```bash
# Store data in /opt/nextwiki-data
DATA_PATH=/opt/nextwiki-data docker compose up -d

# Or set it in .env file
echo "DATA_PATH=/opt/nextwiki-data" >> .env
```

## Deployment Options

### Standard Deployment (Web App Only)
```bash
docker compose up -d
```

### With WebSocket Backend
```bash
docker compose --profile backend up -d
```

### Production Deployment
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Services

### NextWiki Web App
- **Container**: `nextwiki-web`
- **Port**: 3000 (configurable with `WEB_PORT`)
- **Health check**: http://localhost:3000/api/health

### PostgreSQL Database
- **Container**: `nextwiki-postgres`
- **Port**: 5432 (configurable with `DB_PORT`)
- **Data**: Stored in `${DATA_PATH}/postgres`

### Backend (Optional)
- **Container**: `nextwiki-backend`
- **Port**: 3001 (configurable with `BACKEND_PORT`)
- **Purpose**: WebSocket support for real-time collaboration
- **Profile**: `backend` (only starts when requested)

## Backup & Restore

### Manual Backup
```bash
# Create a backup
./scripts/backup/backup.sh

# The backup will be saved to ${DATA_PATH}/backups/
```

### Automated Backup
```bash
# Run backup service (creates backup and exits)
docker compose --profile backup run --rm backup
```

### Restore from Backup
```bash
# List available backups
ls ./data/backups/

# Restore from backup
./scripts/backup/restore.sh nextwiki-backup-20241225_120000.sql.gz
```

### Backup the Entire Data Directory
```bash
# Create a complete backup for transport
tar czf nextwiki-backup-$(date +%Y%m%d).tar.gz ./data

# Restore on another system
tar xzf nextwiki-backup-20241225.tar.gz
```

## Maintenance

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f nextwiki
docker compose logs -f postgres
```

### Update NextWiki
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database Administration
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U nextwiki -d nextwiki

# Import SQL file
cat schema.sql | docker compose exec -T postgres psql -U nextwiki -d nextwiki
```

## Security Considerations

1. **Change default passwords** in `.env`
2. **Generate secure NEXTAUTH_SECRET**
3. **Use HTTPS in production** (configure reverse proxy)
4. **Regular backups** of the data directory
5. **Update containers regularly**

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs nextwiki

# Check disk space
df -h

# Check permissions
ls -la ./data/
```

### Database connection issues
```bash
# Check if PostgreSQL is ready
docker compose exec postgres pg_isready -U nextwiki -d nextwiki

# Reset database (WARNING: destroys data)
docker compose down -v
docker compose up -d
```

### Port conflicts
```bash
# Change ports in .env
WEB_PORT=8080
DB_PORT=5433
BACKEND_PORT=8081
```

## Migration from Existing Installation

If you have an existing NextWiki installation:

1. **Backup existing data**
2. **Export database**: `pg_dump nextwiki | gzip > backup.sql.gz`
3. **Copy configuration**: Migrate your `.env` settings
4. **Start containers**
5. **Import data**: Use `./scripts/backup/restore.sh backup.sql.gz`

## Support

- Check the [NextWiki documentation](../../README.md)
- Review Docker logs: `docker compose logs`
- Verify configuration: `docker compose config`