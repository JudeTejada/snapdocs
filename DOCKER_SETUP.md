# SnapDocs Backend Docker Setup

This setup provides a complete Docker environment for the SnapDocs NestJS backend with PostgreSQL database.

## Services

- **PostgreSQL Database**: `snapdocs-be` (postgres:16-alpine)
- **NestJS Backend**: `snapdocs-backend`

## Quick Start

### Start all services
```bash
docker-compose up -d
```

### Start only PostgreSQL
```bash
docker-compose up -d postgres
```

### Start PostgreSQL and Backend
```bash
docker-compose up -d postgres backend
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f backend
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (reset database)
```bash
docker-compose down -v
```

## Environment Variables

The backend expects these environment variables:

- `NODE_ENV`: Application environment (development/production)
- `PORT`: Backend server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS
- `DATABASE_URL`: PostgreSQL connection string

## Database Configuration

- **Host**: snapdocs-be (container name)
- **Port**: 5432
- **Database**: snapdocs
- **User**: postgres
- **Password**: password

## Prisma Commands

Generate Prisma client:
```bash
cd apps/backend
npx prisma generate
```

Create and apply migrations:
```bash
cd apps/backend
npx prisma migrate dev --name init
```

## API Endpoints

- Base URL: http://localhost:3001/api
- Health check: http://localhost:3001/api/health (when implemented)

## Development

The backend container mounts the source code directory, so changes will be reflected immediately in development mode.

## Troubleshooting

### Check container health
```bash
docker ps
```

### Connect to PostgreSQL
```bash
docker exec -it snapdocs-be psql -U postgres -d snapdocs
```

### View container logs
```bash
docker logs snapdocs-be
docker logs snapdocs-backend
```
