# Agent Guidelines for SnapDocs

# When installing a package for both frontend and backend, use pnpm always 

## Build/Lint/Test Commands
```bash
# Development
pnpm dev              # Run both backend and frontend
pnpm dev:backend      # Backend only (NestJS --watch)
pnpm dev:frontend     # Frontend only (NextJS dev)

# Building & Testing
pnpm build            # Build all apps
pnpm lint             # Lint all apps
pnpm typecheck        # Type check all apps

# Backend specific
cd apps/backend
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode (single test dev)
npm run test:cov      # Coverage report

# Frontend specific
cd apps/frontend
npm run lint:fix      # Fix linting issues
```

## Code Style Guidelines

### TypeScript
- **Backend**: Less strict config (noImplicitAny: false, strictNullChecks: false)
- **Frontend**: Strict mode enabled
- Use path aliases: `@/*` maps to `src/*`

### Imports & Organization
- Use path aliases when possible (`@/config/configuration`)
- Group imports: external libraries, internal modules, local files
- Use relative imports for files in same directory

### Naming Conventions
- **Files**: kebab-case for files, PascalCase for React components
- **Variables/functions**: camelCase
- **Classes/interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE

### Error Handling
- Backend: Use NestJS exception filters, class-validator for DTOs
- Always validate input with class-validator decorators
- Use proper HTTP status codes
- Frontend: Handle axios errors with try/catch

### ESLint Rules
- Backend: @typescript-eslint/recommended (flexible rules)
- Frontend: next/core-web-vitals (NextJS defaults)
- Prettier formatting enforced

### Architecture Patterns
- **Backend**: NestJS modules, dependency injection, decorators
- **Frontend**: Next.js App Router, React hooks, server/client components
- Use Prisma for database (backend/src/prisma/)
- Environment variables in .env files (.env.example provided)
- **Always use NestJS ConfigService for environment variables** - inject ConfigService and use `configService.get()` instead of `process.env`

### Development Workflow
1. Use `pnpm dev` for full-stack development
2. Test individual apps during development
3. Always run lint/typecheck before committing
4. Use `npm run test:watch` for TDD on backend