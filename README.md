# SnapDocs

A modern full-stack application built with:
- **Backend**: NestJS
- **Frontend**: NextJS (App Router)
- **Package Manager**: pnpm workspace

## 🏗️ Project Structure

```
snapdocs/
├── apps/
│   ├── backend/          # NestJS backend application
│   └── frontend/         # NextJS frontend application
├── packages/             # Shared packages (if any)
├── pnpm-workspace.yaml   # pnpm workspace configuration
└── package.json          # Root package.json with workspace scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment files:
```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### Development

Run both applications simultaneously:
```bash
pnpm dev
```

Or run individually:
```bash
# Backend only
pnpm dev:backend

# Frontend only  
pnpm dev:frontend
```

The applications will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001/api

### Building

Build all applications:
```bash
pnpm build
```

Build individually:
```bash
pnpm build:backend
pnpm build:frontend
```

## 📝 Available Scripts

- `pnpm dev` - Start both backend and frontend in development mode
- `pnpm dev:backend` - Start only the backend application
- `pnpm dev:frontend` - Start only the frontend application
- `pnpm build` - Build all applications for production
- `pnpm lint` - Run linting on all packages
- `pnpm typecheck` - Run TypeScript type checking on all packages

## 🔧 Backend (NestJS)

The backend is configured with:
- CORS enabled for frontend communication
- Global API prefix (`/api`)
- Swagger documentation (when configured)
- Environment-based configuration
- Validation pipes

### Key Files
- `src/main.ts` - Application bootstrap
- `src/app.module.ts` - Root module
- `src/app.controller.ts` - Main controller
- `src/app.service.ts` - Main service

## 🎨 Frontend (NextJS)

The frontend uses:
- App Router (Next.js 13+)
- TypeScript
- Modern React patterns with hooks
- Environment variable for API URL

### Key Files
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Home page
- `src/app/globals.css` - Global styles

## 🌐 API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check endpoint

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode
- `FRONTEND_URL` - Frontend URL for CORS

**Frontend (.env)**:
- `NEXT_PUBLIC_API_URL` - Backend API URL

## 🛠️ Development Tips

1. **Hot Reload**: Both applications support hot reload during development
2. **TypeScript**: Full TypeScript support across the workspace
3. **Linting**: ESLint configuration is set up for both applications
4. **Package Sharing**: Easy to add shared packages in the `packages/` directory

## 📦 Adding New Dependencies

Add dependencies to specific apps:
```bash
pnpm --filter backend add package-name
pnpm --filter frontend add package-name
```

Add to root workspace:
```bash
pnpm add -w package-name
```
