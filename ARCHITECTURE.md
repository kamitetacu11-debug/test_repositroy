# TaskMaster — System Architecture Document
## AI-Powered Business Task Management Platform

**Version:** 1.0
**Author:** Senior Software Architect
**Date:** November 2024

---

## 1. Executive Summary

TaskMaster — это AI-powered платформа для управления бизнес-задачами с геймификацией, предназначенная для повышения продуктивности команд. Система объединяет функционал task management, KPI tracking, employee analytics и gamification в едином решении.

### Ключевые характеристики:
- **Multi-platform:** Web, iOS, Android
- **AI-Driven:** Предиктивная аналитика, автоматическая приоритизация
- **Gamification:** Баллы, достижения, лидерборды
- **Enterprise-Ready:** Роли, отделы, audit logs

---

## 2. Architecture Decision: Modular Monolith → Microservices

### Выбор: **Modular Monolith** на старте с возможностью миграции в Microservices

**Обоснование:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE EVOLUTION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Phase 1 (MVP)          Phase 2 (Scale)       Phase 3 (Enterprise)
│   ┌───────────────┐      ┌───────────────┐     ┌───────────────┐
│   │   Modular     │      │   Hybrid      │     │  Full         │
│   │   Monolith    │  →   │   (Extract    │  →  │  Microservices│
│   │               │      │   AI Service) │     │               │
│   └───────────────┘      └───────────────┘     └───────────────┘
│                                                                  │
│   • Быстрый старт         • AI отдельно        • Полная изоляция
│   • Простой деплой        • Очереди            • K8s orchestration
│   • Единая кодовая база   • Event-driven       • Service mesh
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend (Web)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR/SSG, React ecosystem, API routes |
| **Language** | TypeScript | Type safety, better DX |
| **State** | Zustand + TanStack Query | Lightweight, server state caching |
| **UI Library** | shadcn/ui + Tailwind CSS | Customizable, accessible components |
| **Charts** | Recharts | React-native, performant |
| **Real-time** | Socket.IO Client | Bi-directional communication |
| **Forms** | React Hook Form + Zod | Validation, performance |

### 3.2 Mobile

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React Native + Expo | Code sharing with web, fast iteration |
| **Navigation** | Expo Router | File-based routing |
| **UI** | Tamagui | Cross-platform, performant |
| **State** | Same as web (Zustand) | Code reuse |
| **Push Notifications** | Expo Notifications + FCM/APNs | Unified API |

### 3.3 Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js 20 LTS | JavaScript ecosystem, async I/O |
| **Framework** | Fastify | 2x faster than Express, schema validation |
| **Language** | TypeScript | End-to-end type safety |
| **ORM** | Prisma | Type-safe queries, migrations |
| **Validation** | Zod | Shared schemas with frontend |
| **Auth** | Lucia Auth + Arctic | Modern, secure, OAuth support |
| **Real-time** | Socket.IO | WebSocket abstraction |
| **Queue** | BullMQ (Redis) | Background jobs, AI processing |
| **Cache** | Redis | Sessions, rate limiting, caching |

### 3.4 Database

| Type | Technology | Purpose |
|------|-----------|---------|
| **Primary DB** | PostgreSQL 16 | ACID, JSON support, full-text search |
| **Cache/Queue** | Redis 7 | Caching, sessions, job queues |
| **Search** | PostgreSQL FTS (→ Meilisearch при scale) | Task/user search |
| **File Storage** | S3-compatible (MinIO / AWS S3) | Attachments, exports |

### 3.5 AI/ML Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **LLM Provider** | OpenAI GPT-4 / Claude API | Task analysis, recommendations |
| **Embeddings** | OpenAI Ada-002 / Cohere | Semantic search, similarity |
| **Vector Store** | pgvector (PostgreSQL extension) | Embedding storage |
| **ML Pipeline** | Python + FastAPI microservice | Custom analytics models |
| **Scheduled Jobs** | BullMQ | Daily analytics, reports |

### 3.6 DevOps & Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Container** | Docker | Containerization |
| **Orchestration** | Docker Compose → Kubernetes | Local dev → Production |
| **CI/CD** | GitHub Actions | Automated pipelines |
| **Cloud** | AWS / DigitalOcean | Hosting |
| **CDN** | CloudFlare | Static assets, DDoS protection |
| **Monitoring** | Prometheus + Grafana | Metrics |
| **Logging** | Pino + Loki | Structured logging |
| **APM** | Sentry | Error tracking |

---

## 4. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │   Web App    │    │   iOS App    │    │ Android App  │                  │
│   │  (Next.js)   │    │(React Native)│    │(React Native)│                  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│          │                   │                   │                           │
│          └───────────────────┴───────────────────┘                           │
│                              │                                               │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────┼───────────────────────────────────────────────┐
│                         EDGE LAYER                                           │
├──────────────────────────────┼───────────────────────────────────────────────┤
│                              ▼                                               │
│                    ┌──────────────────┐                                      │
│                    │    CloudFlare    │                                      │
│                    │   (CDN + WAF)    │                                      │
│                    └────────┬─────────┘                                      │
│                             │                                                │
└─────────────────────────────┼────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼────────────────────────────────────────────────┐
│                       API GATEWAY                                            │
├─────────────────────────────┼────────────────────────────────────────────────┤
│                             ▼                                                │
│                    ┌──────────────────┐                                      │
│                    │   Load Balancer  │                                      │
│                    │     (nginx)      │                                      │
│                    └────────┬─────────┘                                      │
│                             │                                                │
└─────────────────────────────┼────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼────────────────────────────────────────────────┐
│                     APPLICATION LAYER                                        │
├─────────────────────────────┼────────────────────────────────────────────────┤
│                             ▼                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     FASTIFY API SERVER                                │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                        MODULES                                   │ │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │ │   │
│  │  │  │  Auth   │ │  Tasks  │ │  Users  │ │ Gamifi- │ │Analytics│   │ │   │
│  │  │  │ Module  │ │ Module  │ │ Module  │ │ cation  │ │ Module  │   │ │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │ │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │ │   │
│  │  │  │ Teams   │ │ Notifi- │ │ Reports │ │   AI    │               │ │   │
│  │  │  │ Module  │ │ cations │ │ Module  │ │ Module  │               │ │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                       │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │   │
│  │  │   Socket.IO      │  │   Job Workers    │  │   Scheduled      │   │   │
│  │  │   (Real-time)    │  │   (BullMQ)       │  │   Tasks (Cron)   │   │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                             │                                                │
└─────────────────────────────┼────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼────────────────────────────────────────────────┐
│                       DATA LAYER                                             │
├─────────────────────────────┼────────────────────────────────────────────────┤
│                             ▼                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Redis    │  │   MinIO     │  │  AI Service │         │
│  │ + pgvector  │  │Cache/Queue  │  │   (S3)      │  │  (Python)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Service Communication

### 5.1 Synchronous Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    REST API CONTRACTS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client ──HTTP/JSON──► API Server ──Prisma──► PostgreSQL        │
│                                                                  │
│  Endpoints structure:                                            │
│  • /api/v1/auth/*        - Authentication                       │
│  • /api/v1/users/*       - User management                      │
│  • /api/v1/tasks/*       - Task CRUD                            │
│  • /api/v1/teams/*       - Teams & departments                  │
│  • /api/v1/gamification/* - Points, achievements               │
│  • /api/v1/analytics/*   - Reports, AI insights                 │
│  • /api/v1/admin/*       - Admin operations                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Asynchronous Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Action  │───►│  Redis   │───►│  Worker  │───►│  Result  │  │
│  │(Task Done)│   │  Queue   │    │(BullMQ)  │    │(DB/Notify)│  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  Event Types:                                                    │
│  • task.created      → Notify assignees, update analytics       │
│  • task.completed    → Award points, update leaderboard         │
│  • achievement.unlocked → Send notification, log activity       │
│  • daily.analytics   → Generate reports, AI predictions         │
│  • email.send        → Async email delivery                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Real-time Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOCKET.IO EVENTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Server → Client:                                                │
│  • task:updated       - Task status changed                     │
│  • notification:new   - New notification                        │
│  • leaderboard:update - Rankings changed                        │
│  • achievement:unlock - User earned achievement                 │
│  • team:activity      - Team member activity                    │
│                                                                  │
│  Client → Server:                                                │
│  • task:subscribe     - Subscribe to task updates               │
│  • presence:update    - User online status                      │
│  • typing:start/stop  - Comment typing indicator                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Database Schema

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA (PostgreSQL)                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   organizations  │       │      users       │       │      teams       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │◄──┐   │ id (PK)          │   ┌──►│ id (PK)          │
│ name             │   │   │ organization_id  │───┘   │ organization_id  │
│ slug             │   │   │ email            │       │ name             │
│ plan             │   │   │ password_hash    │       │ description      │
│ settings (JSON)  │   │   │ full_name        │       │ lead_id (FK)     │
│ created_at       │   │   │ avatar_url       │       │ created_at       │
│ updated_at       │   └───│ role             │       └────────┬─────────┘
└──────────────────┘       │ status           │                │
                           │ last_active_at   │                │
                           │ settings (JSON)  │       ┌────────┴─────────┐
                           │ created_at       │       │   team_members   │
                           └────────┬─────────┘       ├──────────────────┤
                                    │                 │ team_id (FK)     │
        ┌───────────────────────────┼─────────────────│ user_id (FK)     │
        │                           │                 │ role             │
        ▼                           ▼                 │ joined_at        │
┌──────────────────┐       ┌──────────────────┐       └──────────────────┘
│  user_sessions   │       │      tasks       │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       ┌──────────────────┐
│ user_id (FK)     │       │ organization_id  │       │   task_comments  │
│ token_hash       │       │ title            │       ├──────────────────┤
│ device_info      │       │ description      │   ┌──►│ id (PK)          │
│ ip_address       │       │ status           │   │   │ task_id (FK)     │
│ expires_at       │       │ priority         │   │   │ user_id (FK)     │
│ created_at       │       │ creator_id (FK)  │   │   │ content          │
└──────────────────┘       │ assignee_id (FK) │   │   │ created_at       │
                           │ team_id (FK)     │   │   └──────────────────┘
                           │ parent_id (FK)   │   │
                           │ due_date         │   │   ┌──────────────────┐
                           │ estimated_hours  │   │   │ task_attachments │
                           │ actual_hours     │───┼──►├──────────────────┤
                           │ points           │   │   │ id (PK)          │
                           │ tags (ARRAY)     │   │   │ task_id (FK)     │
                           │ metadata (JSON)  │   │   │ file_url         │
                           │ completed_at     │   │   │ file_name        │
                           │ created_at       │   │   │ file_size        │
                           │ updated_at       │   │   │ uploaded_by (FK) │
                           └────────┬─────────┘   │   │ created_at       │
                                    │             │   └──────────────────┘
                                    │             │
        ┌───────────────────────────┴─────────────┘
        │
        ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   user_points    │       │   achievements   │       │ user_achievements│
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │◄──────│ id (PK)          │
│ user_id (FK)     │       │ code             │       │ user_id (FK)     │
│ points           │       │ name             │       │ achievement_id   │
│ source_type      │       │ description      │       │ unlocked_at      │
│ source_id        │       │ icon             │       │ metadata (JSON)  │
│ description      │       │ points           │       └──────────────────┘
│ created_at       │       │ criteria (JSON)  │
└──────────────────┘       │ tier             │       ┌──────────────────┐
                           │ created_at       │       │   leaderboards   │
                           └──────────────────┘       ├──────────────────┤
                                                      │ id (PK)          │
┌──────────────────┐       ┌──────────────────┐       │ organization_id  │
│  activity_logs   │       │   notifications  │       │ period_type      │
├──────────────────┤       ├──────────────────┤       │ period_start     │
│ id (PK)          │       │ id (PK)          │       │ period_end       │
│ organization_id  │       │ user_id (FK)     │       │ rankings (JSON)  │
│ user_id (FK)     │       │ type             │       │ generated_at     │
│ action           │       │ title            │       └──────────────────┘
│ entity_type      │       │ body             │
│ entity_id        │       │ data (JSON)      │       ┌──────────────────┐
│ old_values (JSON)│       │ read_at          │       │  ai_task_vectors │
│ new_values (JSON)│       │ created_at       │       ├──────────────────┤
│ ip_address       │       └──────────────────┘       │ id (PK)          │
│ user_agent       │                                  │ task_id (FK)     │
│ created_at       │                                  │ embedding (vector)│
└──────────────────┘                                  │ model_version    │
                                                      │ created_at       │
                                                      └──────────────────┘
```

### 6.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), pg_trgm]
}

// ============================================
// ORGANIZATION & USERS
// ============================================

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      Plan     @default(FREE)
  settings  Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users        User[]
  teams        Team[]
  tasks        Task[]
  leaderboards Leaderboard[]
  activityLogs ActivityLog[]

  @@map("organizations")
}

enum Plan {
  FREE
  STARTER
  BUSINESS
  ENTERPRISE
}

model User {
  id             String    @id @default(cuid())
  organizationId String    @map("organization_id")
  email          String
  passwordHash   String    @map("password_hash")
  fullName       String    @map("full_name")
  avatarUrl      String?   @map("avatar_url")
  role           UserRole  @default(MEMBER)
  status         UserStatus @default(ACTIVE)
  lastActiveAt   DateTime? @map("last_active_at")
  settings       Json      @default("{}")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  organization     Organization      @relation(fields: [organizationId], references: [id])
  sessions         UserSession[]
  createdTasks     Task[]            @relation("TaskCreator")
  assignedTasks    Task[]            @relation("TaskAssignee")
  teamMemberships  TeamMember[]
  ledTeams         Team[]            @relation("TeamLead")
  points           UserPoint[]
  achievements     UserAchievement[]
  notifications    Notification[]
  comments         TaskComment[]
  attachments      TaskAttachment[]
  activityLogs     ActivityLog[]

  @@unique([organizationId, email])
  @@index([organizationId, role])
  @@index([organizationId, status])
  @@map("users")
}

enum UserRole {
  OWNER
  ADMIN
  MANAGER
  MEMBER
  VIEWER
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

model UserSession {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  tokenHash  String   @unique @map("token_hash")
  deviceInfo Json?    @map("device_info")
  ipAddress  String?  @map("ip_address")
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("user_sessions")
}

// ============================================
// TEAMS
// ============================================

model Team {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  name           String
  description    String?
  leadId         String?  @map("lead_id")
  color          String   @default("#6366f1")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  lead         User?        @relation("TeamLead", fields: [leadId], references: [id])
  members      TeamMember[]
  tasks        Task[]

  @@unique([organizationId, name])
  @@map("teams")
}

model TeamMember {
  id       String         @id @default(cuid())
  teamId   String         @map("team_id")
  userId   String         @map("user_id")
  role     TeamMemberRole @default(MEMBER)
  joinedAt DateTime       @default(now()) @map("joined_at")

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@map("team_members")
}

enum TeamMemberRole {
  LEAD
  MEMBER
}

// ============================================
// TASKS
// ============================================

model Task {
  id             String     @id @default(cuid())
  organizationId String     @map("organization_id")
  title          String
  description    String?
  status         TaskStatus @default(TODO)
  priority       Priority   @default(MEDIUM)
  creatorId      String     @map("creator_id")
  assigneeId     String?    @map("assignee_id")
  teamId         String?    @map("team_id")
  parentId       String?    @map("parent_id")
  dueDate        DateTime?  @map("due_date")
  estimatedHours Float?     @map("estimated_hours")
  actualHours    Float?     @map("actual_hours")
  points         Int        @default(10)
  tags           String[]   @default([])
  metadata       Json       @default("{}")
  completedAt    DateTime?  @map("completed_at")
  createdAt      DateTime   @default(now()) @map("created_at")
  updatedAt      DateTime   @updatedAt @map("updated_at")

  organization Organization     @relation(fields: [organizationId], references: [id])
  creator      User             @relation("TaskCreator", fields: [creatorId], references: [id])
  assignee     User?            @relation("TaskAssignee", fields: [assigneeId], references: [id])
  team         Team?            @relation(fields: [teamId], references: [id])
  parent       Task?            @relation("Subtasks", fields: [parentId], references: [id])
  subtasks     Task[]           @relation("Subtasks")
  comments     TaskComment[]
  attachments  TaskAttachment[]
  aiVector     AiTaskVector?

  @@index([organizationId, status])
  @@index([organizationId, assigneeId])
  @@index([organizationId, teamId])
  @@index([organizationId, dueDate])
  @@index([createdAt])
  @@map("tasks")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  BLOCKED
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model TaskComment {
  id        String   @id @default(cuid())
  taskId    String   @map("task_id")
  userId    String   @map("user_id")
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@index([taskId])
  @@map("task_comments")
}

model TaskAttachment {
  id         String   @id @default(cuid())
  taskId     String   @map("task_id")
  uploadedBy String   @map("uploaded_by")
  fileUrl    String   @map("file_url")
  fileName   String   @map("file_name")
  fileSize   Int      @map("file_size")
  mimeType   String   @map("mime_type")
  createdAt  DateTime @default(now()) @map("created_at")

  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  uploader User @relation(fields: [uploadedBy], references: [id])

  @@index([taskId])
  @@map("task_attachments")
}

// ============================================
// GAMIFICATION
// ============================================

model UserPoint {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  points      Int
  sourceType  String   @map("source_type")  // task_completed, achievement, bonus
  sourceId    String?  @map("source_id")
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([sourceType])
  @@map("user_points")
}

model Achievement {
  id          String          @id @default(cuid())
  code        String          @unique
  name        String
  description String
  icon        String
  points      Int             @default(0)
  criteria    Json            // { type: "tasks_completed", count: 10 }
  tier        AchievementTier @default(BRONZE)
  createdAt   DateTime        @default(now()) @map("created_at")

  userAchievements UserAchievement[]

  @@map("achievements")
}

enum AchievementTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
  DIAMOND
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  achievementId String   @map("achievement_id")
  unlockedAt    DateTime @default(now()) @map("unlocked_at")
  metadata      Json     @default("{}")

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement Achievement @relation(fields: [achievementId], references: [id])

  @@unique([userId, achievementId])
  @@map("user_achievements")
}

model Leaderboard {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  periodType     String   @map("period_type")  // daily, weekly, monthly, all_time
  periodStart    DateTime @map("period_start")
  periodEnd      DateTime @map("period_end")
  rankings       Json     // [{ userId, rank, points, tasksCompleted }]
  generatedAt    DateTime @default(now()) @map("generated_at")

  organization Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, periodType, periodStart])
  @@map("leaderboards")
}

// ============================================
// NOTIFICATIONS
// ============================================

model Notification {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  type      String    // task_assigned, achievement_unlocked, mention, etc.
  title     String
  body      String?
  data      Json      @default("{}")
  readAt    DateTime? @map("read_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@index([userId, createdAt])
  @@map("notifications")
}

// ============================================
// ACTIVITY LOGS
// ============================================

model ActivityLog {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  userId         String?  @map("user_id")
  action         String   // create, update, delete, login, etc.
  entityType     String   @map("entity_type")  // task, user, team, etc.
  entityId       String?  @map("entity_id")
  oldValues      Json?    @map("old_values")
  newValues      Json?    @map("new_values")
  ipAddress      String?  @map("ip_address")
  userAgent      String?  @map("user_agent")
  createdAt      DateTime @default(now()) @map("created_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  user         User?        @relation(fields: [userId], references: [id])

  @@index([organizationId, createdAt])
  @@index([organizationId, entityType, entityId])
  @@index([userId, createdAt])
  @@map("activity_logs")
}

// ============================================
// AI / VECTORS
// ============================================

model AiTaskVector {
  id           String                    @id @default(cuid())
  taskId       String                    @unique @map("task_id")
  embedding    Unsupported("vector(1536)")
  modelVersion String                    @default("ada-002") @map("model_version")
  createdAt    DateTime                  @default(now()) @map("created_at")

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@map("ai_task_vectors")
}
```

---

## 7. AI Analytics Architecture

### 7.1 AI Components Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI ANALYTICS ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              AI FEATURES                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. SMART TASK PRIORITIZATION                                                │
│     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│     │   Deadline  │ +  │  Workload   │ +  │Dependencies │ = Priority Score  │
│     │   Analysis  │    │  Balance    │    │   Graph     │                   │
│     └─────────────┘    └─────────────┘    └─────────────┘                   │
│                                                                               │
│  2. PRODUCTIVITY PREDICTION                                                  │
│     ┌─────────────────────────────────────────────────────────┐             │
│     │  Historical Data → ML Model → Completion Probability     │             │
│     │                                                          │             │
│     │  Features:                                               │             │
│     │  • Task complexity (estimated hours)                     │             │
│     │  • User past performance                                 │             │
│     │  • Current workload                                      │             │
│     │  • Time of day/week patterns                            │             │
│     └─────────────────────────────────────────────────────────┘             │
│                                                                               │
│  3. SEMANTIC TASK SEARCH                                                     │
│     ┌─────────────────────────────────────────────────────────┐             │
│     │  Query → Embedding → pgvector Similarity → Results      │             │
│     └─────────────────────────────────────────────────────────┘             │
│                                                                               │
│  4. AUTOMATED INSIGHTS                                                       │
│     ┌─────────────────────────────────────────────────────────┐             │
│     │  • Bottleneck detection                                  │             │
│     │  • Team performance trends                               │             │
│     │  • Burnout risk indicators                               │             │
│     │  • Optimal task assignment suggestions                   │             │
│     └─────────────────────────────────────────────────────────┘             │
│                                                                               │
│  5. NATURAL LANGUAGE TASK CREATION                                           │
│     ┌─────────────────────────────────────────────────────────┐             │
│     │  "Schedule a meeting with John next Tuesday about Q4"   │             │
│     │           ↓                                              │             │
│     │  GPT-4 Parsing → Structured Task + Auto-assignment      │             │
│     └─────────────────────────────────────────────────────────┘             │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 AI Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI PROCESSING FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│   │  Event  │───►│  Queue  │───►│   AI    │───►│  Store  │     │
│   │ Trigger │    │ (Redis) │    │ Worker  │    │ Results │     │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘     │
│                                                                  │
│   Events:                      Processing:                       │
│   • task.created              • Generate embedding               │
│   • task.updated              • Update predictions               │
│   • daily.analytics           • Generate insights                │
│   • user.request              • Answer questions                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 AI Service Interface

```typescript
// src/modules/ai/ai.service.ts

interface AIService {
  // Task Intelligence
  generateTaskEmbedding(task: Task): Promise<number[]>;
  findSimilarTasks(query: string, limit: number): Promise<Task[]>;
  suggestPriority(task: Task): Promise<Priority>;
  estimateCompletion(task: Task): Promise<{ probability: number; eta: Date }>;

  // Natural Language
  parseNaturalLanguageTask(input: string): Promise<ParsedTask>;
  generateTaskSummary(tasks: Task[]): Promise<string>;

  // Analytics
  generateWeeklyInsights(organizationId: string): Promise<Insights>;
  detectBottlenecks(teamId: string): Promise<Bottleneck[]>;
  predictBurnoutRisk(userId: string): Promise<RiskAssessment>;

  // Recommendations
  suggestAssignee(task: Task): Promise<User[]>;
  recommendNextTasks(userId: string): Promise<Task[]>;
}
```

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: NETWORK SECURITY                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  • CloudFlare WAF (DDoS protection, bot mitigation)                         │
│  • TLS 1.3 everywhere                                                        │
│  • VPC isolation for databases                                               │
│  • IP whitelisting for admin endpoints                                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: APPLICATION SECURITY                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  • Rate limiting (100 req/min per user)                                      │
│  • CORS strict policy                                                        │
│  • Helmet.js security headers                                                │
│  • Input validation (Zod schemas)                                            │
│  • SQL injection prevention (Prisma parameterized queries)                   │
│  • XSS prevention (content sanitization)                                     │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: AUTHENTICATION                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  • Session-based auth (Lucia)                                                │
│  • Secure cookie settings (httpOnly, secure, sameSite)                       │
│  • Password hashing (Argon2id)                                               │
│  • OAuth 2.0 (Google, Microsoft, GitHub)                                     │
│  • Optional 2FA (TOTP)                                                       │
│  • Session invalidation on password change                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: AUTHORIZATION (RBAC + ABAC)                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Role-Based Access Control:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  OWNER   │ Full access, billing, delete org                             ││
│  │  ADMIN   │ User management, settings, all data                          ││
│  │  MANAGER │ Team management, reports, assign tasks                       ││
│  │  MEMBER  │ Create/edit own tasks, view team tasks                       ││
│  │  VIEWER  │ Read-only access                                             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                               │
│  Attribute-Based Policies:                                                   │
│  • task.assignee === currentUser → can edit                                 │
│  • task.team includes currentUser → can view                                │
│  • task.creator === currentUser → can delete                                │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: DATA SECURITY                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│  • Encryption at rest (PostgreSQL TDE)                                       │
│  • Encryption in transit (TLS)                                               │
│  • PII masking in logs                                                       │
│  • Automated backups (daily, encrypted)                                      │
│  • Data retention policies                                                   │
│  • GDPR compliance (data export, deletion)                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER 6: AUDIT & MONITORING                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  • Complete audit trail (activity_logs table)                               │
│  • Failed login attempt tracking                                             │
│  • Suspicious activity alerts                                                │
│  • Security event logging to SIEM                                            │
│  • Regular security scans                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Permission Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION MATRIX                                    │
├─────────────┬───────┬───────┬─────────┬────────┬────────┬──────────────────┤
│ Resource    │ OWNER │ ADMIN │ MANAGER │ MEMBER │ VIEWER │ Conditions       │
├─────────────┼───────┼───────┼─────────┼────────┼────────┼──────────────────┤
│ Org Settings│  CRUD │  RU   │   R     │   -    │   -    │                  │
│ Users       │  CRUD │  CRUD │   R     │   R    │   R    │ same org         │
│ Teams       │  CRUD │  CRUD │  CRUD   │   R    │   R    │ manager: own team│
│ Tasks       │  CRUD │  CRUD │  CRUD   │  CRUD  │   R    │ member: own/team │
│ Comments    │  CRUD │  CRUD │  CRUD   │  CRUD  │   R    │ delete: own only │
│ Reports     │  CRUD │  CRUD │   R     │   R*   │   R*   │ *own stats only  │
│ Leaderboard │   R   │   R   │   R     │   R    │   R    │                  │
│ Audit Logs  │   R   │   R   │   -     │   -    │   -    │                  │
│ AI Features │  CRUD │  CRUD │  CRUD   │  CRUD  │   R    │                  │
└─────────────┴───────┴───────┴─────────┴────────┴────────┴──────────────────┘

C = Create, R = Read, U = Update, D = Delete
```

---

## 9. Scalability Architecture

### 9.1 Horizontal Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SCALING ARCHITECTURE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │   CloudFlare     │
                         │   (Global CDN)   │
                         └────────┬─────────┘
                                  │
                         ┌────────┴─────────┐
                         │  Load Balancer   │
                         │    (nginx)       │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
       ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
       │  API Server  │   │  API Server  │   │  API Server  │
       │   Node 1     │   │   Node 2     │   │   Node N     │
       └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
       ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
       │   Worker 1   │   │   Worker 2   │   │   Worker N   │
       │  (BullMQ)    │   │  (BullMQ)    │   │  (BullMQ)    │
       └──────────────┘   └──────────────┘   └──────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
       ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
       │  PostgreSQL  │   │    Redis     │   │    MinIO     │
       │  (Primary +  │   │  (Cluster)   │   │  (Cluster)   │
       │   Replicas)  │   │              │   │              │
       └──────────────┘   └──────────────┘   └──────────────┘
```

### 9.2 Scaling Metrics & Triggers

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTO-SCALING RULES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  API Servers:                                                    │
│  ├─ Scale UP:   CPU > 70% for 2 min OR Memory > 80%            │
│  ├─ Scale DOWN: CPU < 30% for 10 min AND Memory < 50%          │
│  ├─ Min: 2 instances                                            │
│  └─ Max: 20 instances                                           │
│                                                                  │
│  Workers:                                                        │
│  ├─ Scale UP:   Queue depth > 1000 OR Job wait time > 30s      │
│  ├─ Scale DOWN: Queue depth < 100 for 10 min                   │
│  ├─ Min: 1 instance                                             │
│  └─ Max: 10 instances                                           │
│                                                                  │
│  Database:                                                       │
│  ├─ Read replicas: Add when read IOPS > 80% capacity           │
│  ├─ Connection pooling: PgBouncer (max 10000 connections)      │
│  └─ Vertical scaling: CPU/RAM when queries slow down           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHING LAYERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  L1: Application Memory (Node.js)                               │
│  ├─ Config, feature flags                                       │
│  ├─ TTL: Until restart                                          │
│  └─ Size: < 50MB                                                │
│                                                                  │
│  L2: Redis Cache                                                 │
│  ├─ User sessions                    TTL: 24h                   │
│  ├─ Leaderboard rankings            TTL: 5min                   │
│  ├─ User permissions                TTL: 10min                  │
│  ├─ API rate limiting               TTL: 1min                   │
│  └─ Frequently accessed tasks       TTL: 2min                   │
│                                                                  │
│  L3: CDN (CloudFlare)                                           │
│  ├─ Static assets                   TTL: 1 year                 │
│  ├─ API responses (GET, public)     TTL: 60s                    │
│  └─ Images/attachments              TTL: 1 week                 │
│                                                                  │
│  Cache Invalidation:                                             │
│  ├─ Event-driven (task.updated → invalidate task:*)            │
│  ├─ TTL expiration                                              │
│  └─ Manual purge endpoint (admin only)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Project Directory Structure

```
taskmaster/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, test, build
│   │   ├── deploy-staging.yml        # Deploy to staging
│   │   └── deploy-production.yml     # Deploy to production
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── apps/
│   ├── web/                          # Next.js Web Application
│   │   ├── public/
│   │   │   ├── fonts/
│   │   │   ├── images/
│   │   │   └── favicon.ico
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── register/
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── tasks/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── new/
│   │   │   │   │   ├── teams/
│   │   │   │   │   ├── leaderboard/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── api/              # API routes (BFF)
│   │   │   │   │   └── [...proxy]/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn components
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── TaskCard.tsx
│   │   │   │   │   ├── TaskList.tsx
│   │   │   │   │   ├── TaskForm.tsx
│   │   │   │   │   └── TaskFilters.tsx
│   │   │   │   ├── teams/
│   │   │   │   ├── leaderboard/
│   │   │   │   ├── analytics/
│   │   │   │   └── layout/
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       ├── Header.tsx
│   │   │   │       └── MobileNav.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTasks.ts
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useRealtime.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # API client
│   │   │   │   ├── socket.ts         # Socket.IO client
│   │   │   │   └── utils.ts
│   │   │   ├── stores/
│   │   │   │   ├── authStore.ts
│   │   │   │   └── uiStore.ts
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/                       # React Native (Expo)
│       ├── app/                      # Expo Router
│       │   ├── (auth)/
│       │   ├── (tabs)/
│       │   │   ├── tasks/
│       │   │   ├── teams/
│       │   │   ├── leaderboard/
│       │   │   └── profile/
│       │   ├── _layout.tsx
│       │   └── index.tsx
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── stores/
│       ├── assets/
│       ├── app.json
│       ├── eas.json
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── api/                          # Fastify Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.schema.ts
│   │   │   │   │   └── auth.routes.ts
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   ├── users.schema.ts
│   │   │   │   │   └── users.routes.ts
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── tasks.controller.ts
│   │   │   │   │   ├── tasks.service.ts
│   │   │   │   │   ├── tasks.schema.ts
│   │   │   │   │   └── tasks.routes.ts
│   │   │   │   ├── teams/
│   │   │   │   ├── gamification/
│   │   │   │   │   ├── points.service.ts
│   │   │   │   │   ├── achievements.service.ts
│   │   │   │   │   └── leaderboard.service.ts
│   │   │   │   ├── analytics/
│   │   │   │   ├── notifications/
│   │   │   │   └── ai/
│   │   │   │       ├── ai.service.ts
│   │   │   │       ├── embeddings.service.ts
│   │   │   │       └── insights.service.ts
│   │   │   ├── plugins/
│   │   │   │   ├── auth.plugin.ts
│   │   │   │   ├── prisma.plugin.ts
│   │   │   │   ├── redis.plugin.ts
│   │   │   │   └── socket.plugin.ts
│   │   │   ├── middleware/
│   │   │   │   ├── authenticate.ts
│   │   │   │   ├── authorize.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── validate.ts
│   │   │   ├── jobs/
│   │   │   │   ├── worker.ts
│   │   │   │   ├── queues.ts
│   │   │   │   ├── dailyAnalytics.job.ts
│   │   │   │   ├── leaderboardUpdate.job.ts
│   │   │   │   └── emailNotification.job.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   ├── errors.ts
│   │   │   │   └── helpers.ts
│   │   │   ├── config/
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── index.ts              # Server entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── shared/                       # Shared code (web + mobile + api)
│   │   ├── src/
│   │   │   ├── schemas/              # Zod schemas
│   │   │   │   ├── auth.schema.ts
│   │   │   │   ├── task.schema.ts
│   │   │   │   ├── user.schema.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── roles.ts
│   │   │   │   ├── taskStatus.ts
│   │   │   │   └── achievements.ts
│   │   │   └── utils/
│   │   │       ├── date.ts
│   │   │       └── format.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── ai-service/                   # Python AI Microservice
│       ├── src/
│       │   ├── api/
│       │   │   ├── routes.py
│       │   │   └── deps.py
│       │   ├── services/
│       │   │   ├── embeddings.py
│       │   │   ├── predictions.py
│       │   │   └── insights.py
│       │   ├── models/
│       │   │   └── schemas.py
│       │   ├── config.py
│       │   └── main.py
│       ├── tests/
│       ├── requirements.txt
│       ├── Dockerfile
│       └── pyproject.toml
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml        # Local development
│   │   ├── docker-compose.prod.yml   # Production
│   │   ├── nginx/
│   │   │   └── nginx.conf
│   │   └── postgres/
│   │       └── init.sql
│   ├── kubernetes/
│   │   ├── base/
│   │   │   ├── api-deployment.yaml
│   │   │   ├── api-service.yaml
│   │   │   ├── worker-deployment.yaml
│   │   │   └── ingress.yaml
│   │   ├── overlays/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── kustomization.yaml
│   └── terraform/
│       ├── modules/
│       │   ├── vpc/
│       │   ├── rds/
│       │   ├── redis/
│       │   └── ecs/
│       ├── environments/
│       │   ├── staging/
│       │   └── production/
│       └── main.tf
│
├── scripts/
│   ├── setup.sh                      # Local setup script
│   ├── seed-db.sh                    # Database seeding
│   └── migrate.sh                    # Run migrations
│
├── docs/
│   ├── api/                          # API documentation
│   │   └── openapi.yaml
│   ├── architecture/
│   │   ├── decisions/                # ADRs
│   │   └── diagrams/
│   └── guides/
│       ├── DEVELOPMENT.md
│       ├── DEPLOYMENT.md
│       └── CONTRIBUTING.md
│
├── .env.example
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── turbo.json                        # Turborepo config
├── package.json                      # Root package.json
├── pnpm-workspace.yaml               # pnpm workspaces
└── README.md
```

---

## 11. Development & Deployment

### 11.1 Local Development

```bash
# Clone & setup
git clone https://github.com/company/taskmaster.git
cd taskmaster
pnpm install

# Start infrastructure
docker-compose up -d postgres redis minio

# Run migrations & seed
pnpm db:migrate
pnpm db:seed

# Start development servers
pnpm dev          # All apps in parallel
pnpm dev:web      # Only web
pnpm dev:api      # Only API
pnpm dev:mobile   # Only mobile (Expo)
```

### 11.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                       CI/CD PIPELINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Push/PR                                                         │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CI: Lint → Type Check → Unit Tests → Integration Tests  │   │
│  └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     │ (main branch)                                              │
│     ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Build: Docker images → Push to Registry                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Deploy Staging → E2E Tests → Manual Approval            │   │
│  └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Deploy Production (Blue/Green) → Health Checks          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Metrics (Prometheus + Grafana):                                │
│  ├─ Request latency (p50, p95, p99)                            │
│  ├─ Error rates by endpoint                                     │
│  ├─ Database query performance                                  │
│  ├─ Queue depth and processing time                            │
│  ├─ Active WebSocket connections                               │
│  └─ Business metrics (tasks created, completed)                │
│                                                                  │
│  Logging (Pino + Loki):                                         │
│  ├─ Structured JSON logs                                        │
│  ├─ Request tracing (correlation IDs)                          │
│  ├─ Error stack traces                                          │
│  └─ Audit logs (security events)                               │
│                                                                  │
│  Error Tracking (Sentry):                                       │
│  ├─ Real-time error alerts                                      │
│  ├─ Release tracking                                            │
│  ├─ Performance monitoring                                      │
│  └─ User impact analysis                                        │
│                                                                  │
│  Alerting:                                                       │
│  ├─ PagerDuty integration                                       │
│  ├─ Slack notifications                                         │
│  └─ Escalation policies                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. Cost Estimation (AWS)

| Component | Service | Estimated Monthly Cost |
|-----------|---------|----------------------|
| Compute | ECS Fargate (3x API, 2x Worker) | $150 |
| Database | RDS PostgreSQL (db.t3.medium) | $70 |
| Cache | ElastiCache Redis (cache.t3.micro) | $25 |
| Storage | S3 (50GB) | $5 |
| CDN | CloudFlare Pro | $20 |
| AI API | OpenAI (GPT-4, Ada) | $100-500 |
| Monitoring | Sentry, Grafana Cloud | $50 |
| **Total** | | **$420-820/month** |

*Для MVP с ~1000 активных пользователей*

---

## 14. Timeline & Milestones

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Foundation** | 4 weeks | Auth, Users, Teams CRUD, Basic UI |
| **Phase 2: Core Tasks** | 4 weeks | Tasks CRUD, Comments, Attachments |
| **Phase 3: Gamification** | 3 weeks | Points, Achievements, Leaderboards |
| **Phase 4: AI Features** | 4 weeks | Embeddings, Smart Priority, Insights |
| **Phase 5: Mobile** | 4 weeks | iOS/Android apps |
| **Phase 6: Polish** | 3 weeks | Performance, Security audit, Documentation |

**Total: ~22 weeks (5.5 months) to production-ready MVP**

---

*Document prepared by Senior Software Architect*
*Last updated: November 2024*
