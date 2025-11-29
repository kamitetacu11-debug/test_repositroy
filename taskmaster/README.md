# TaskMaster

AI-Powered Business Task Management Platform with Gamification

## Overview

TaskMaster is a modern, gamified task management platform designed for teams and businesses. It combines AI-driven insights, real-time collaboration, and game mechanics to boost productivity and engagement.

### Key Features

- **Smart Task Management**: AI-powered task prioritization and intelligent deadline suggestions
- **Gamification**: Points, levels, achievements, and leaderboards to boost motivation
- **Team Collaboration**: Real-time updates, team competitions, and collaborative workflows
- **Advanced Analytics**: Deep insights into productivity patterns and performance metrics
- **AI-Powered Insights**: Predictive analytics and personalized recommendations
- **Enterprise Security**: Role-based access, audit logs, and data encryption

## Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **ORM**: Prisma
- **Auth**: JWT + Lucia Auth

### Frontend (Web)
- **Framework**: Next.js 14 (App Router)
- **UI**: React + Tailwind CSS + shadcn/ui
- **State**: Zustand + TanStack Query
- **Animations**: Framer Motion

### Mobile
- **Framework**: React Native + Expo
- **Navigation**: Expo Router
- **State**: Zustand

### DevOps
- **Containers**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/taskmaster.git
cd taskmaster
```

2. **Start infrastructure with Docker**
```bash
docker-compose up -d postgres redis
```

3. **Setup Backend**
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

4. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

5. **Setup Mobile**
```bash
cd mobile
npm install
npm start
```

### Using Docker Compose

Run the entire stack:
```bash
docker-compose up -d
```

Access:
- Web App: http://localhost:3001
- API: http://localhost:3000
- API Docs: http://localhost:3000/docs

## Project Structure

```
taskmaster/
├── backend/                 # Node.js + Fastify API
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── modules/        # Feature modules
│   │   │   ├── users/      # Authentication & users
│   │   │   ├── tasks/      # Task management
│   │   │   ├── teams/      # Team management
│   │   │   ├── points/     # Points system
│   │   │   ├── leaderboard/# Leaderboards
│   │   │   ├── gamification/# Achievements & quests
│   │   │   ├── ai/         # AI analytics
│   │   │   └── notifications/# Real-time notifications
│   │   └── main.ts
│   ├── prisma/             # Database schema & migrations
│   └── Dockerfile
│
├── frontend/               # Next.js Web App
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities
│   │   ├── stores/        # Zustand stores
│   │   └── styles/        # Global styles
│   └── Dockerfile
│
├── mobile/                 # React Native + Expo
│   ├── src/
│   │   ├── app/           # Expo router screens
│   │   ├── components/    # React Native components
│   │   ├── services/      # API services
│   │   └── stores/        # Zustand stores
│   └── app.json
│
├── kubernetes/            # K8s manifests
├── .github/workflows/     # CI/CD pipelines
└── docker-compose.yml
```

## API Documentation

API documentation is available at `/docs` when running the backend.

### Main Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/leaderboard/users` - Get user leaderboard
- `GET /api/v1/gamification/achievements` - Get achievements
- `GET /api/v1/ai/insights` - Get AI insights

## Demo Credentials

```
Admin: admin@taskmaster.io / admin123
User:  john@taskmaster.io / demo123
User:  jane@taskmaster.io / demo123
```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskmaster
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
OPENAI_API_KEY=optional
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## Deployment

### Docker
```bash
docker-compose -f docker-compose.yml up -d
```

### Kubernetes
```bash
kubectl apply -f kubernetes/deployment.yml
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
