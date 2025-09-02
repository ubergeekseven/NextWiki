# NextWiki Docker Management Makefile

.PHONY: help build up down logs clean backup restore setup

# Default target
help:
	@echo "NextWiki Docker Management"
	@echo ""
	@echo "Available commands:"
	@echo "  setup     - Initial setup (copy env file)"
	@echo "  build     - Build Docker images"
	@echo "  up        - Start services"
	@echo "  up-full   - Start with backend service"
	@echo "  down      - Stop services"
	@echo "  restart   - Restart services"
	@echo "  logs      - View logs"
	@echo "  clean     - Stop and remove containers/volumes"
	@echo "  backup    - Create database backup"
	@echo "  restore   - Restore database (requires BACKUP_FILE)"
	@echo "  update    - Update and rebuild containers"
	@echo "  status    - Show service status"

# Initial setup
setup:
	@echo "Setting up NextWiki Docker environment..."
	@if [ ! -f .env ]; then cp .env.docker .env && echo "✅ Created .env file from template"; else echo "⚠️  .env file already exists"; fi
	@echo "📝 Please edit .env file with your configuration"
	@echo "🔑 Generate NEXTAUTH_SECRET with: openssl rand -base64 32"

# Build images
build:
	docker compose build

# Start services (web app only)
up: setup
	docker compose up -d
	@echo "🚀 NextWiki is starting..."
	@echo "🌐 Web app will be available at http://localhost:3000"
	@echo "📊 Use 'make logs' to see startup logs"

# Start with backend
up-full: setup
	docker compose --profile backend up -d
	@echo "🚀 NextWiki with backend is starting..."
	@echo "🌐 Web app: http://localhost:3000"
	@echo "⚡ Backend: http://localhost:3001"

# Stop services
down:
	docker compose down

# Restart services
restart: down up

# View logs
logs:
	docker compose logs -f

# Clean everything
clean:
	docker compose down -v --remove-orphans
	docker image prune -f

# Create backup
backup:
	@echo "📦 Creating database backup..."
	@./scripts/backup/backup.sh

# Restore backup (usage: make restore BACKUP_FILE=filename)
restore:
	@if [ -z "$(BACKUP_FILE)" ]; then echo "❌ Please specify BACKUP_FILE=filename"; exit 1; fi
	@./scripts/backup/restore.sh $(BACKUP_FILE)

# Update containers
update:
	git pull
	docker compose down
	docker compose build --no-cache
	docker compose up -d
	@echo "🔄 NextWiki has been updated"

# Show status
status:
	@echo "📊 NextWiki Service Status:"
	@docker compose ps
	@echo ""
	@echo "💾 Data Directory:"
	@du -sh ./data 2>/dev/null || echo "No data directory found"

# Production deployment
prod: setup
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "🚀 NextWiki production deployment started"

# Development mode (with file watching)
dev:
	@echo "🔧 Starting NextWiki in development mode..."
	@echo "📝 This will start the development server with hot reloading"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Health check
health:
	@echo "🏥 Checking service health..."
	@curl -s http://localhost:3000/api/health | python -m json.tool 2>/dev/null || echo "❌ Web service not responding"
	@curl -s http://localhost:3001/health | python -m json.tool 2>/dev/null || echo "ℹ️  Backend service not running or not responding"