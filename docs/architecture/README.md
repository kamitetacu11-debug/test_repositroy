# TaskMaster Enterprise ERP/CRM Platform
## Architecture Documentation

**Version:** 2.0
**Status:** Architecture Design Complete
**Level:** Enterprise (1C:ERP / SAP / Odoo comparable)

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01-AUDIT-REPORT.md](./01-AUDIT-REPORT.md) | AS-IS → TO-BE Analysis |
| [02-ARCHITECTURE-DESIGN.md](./02-ARCHITECTURE-DESIGN.md) | New Architecture & Directory Structure |
| [03-DATABASE-SCHEMA.md](./03-DATABASE-SCHEMA.md) | ER Diagrams & SQL Schema |
| [04-WORKFLOW-MODULE.md](./04-WORKFLOW-MODULE.md) | Task Lifecycle & Approval System |
| [05-FILE-SYSTEM-MODULE.md](./05-FILE-SYSTEM-MODULE.md) | File Upload & Code Detection |
| [06-AI-MODULE.md](./06-AI-MODULE.md) | AI Analysis & Predictions |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TASKMASTER ENTERPRISE ERP/CRM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODULES                                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │   CRM   │ │  Sales  │ │Warehouse│ │Purchasing│ │ Finance │ │Accounting│ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│  │Workflow │ │  Files  │ │   AI    │ │ Reports │                          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                          │
│                                                                             │
│  ARCHITECTURE: DDD + Clean Architecture + CQRS + Event Sourcing            │
│  STACK: Go/TypeScript + PostgreSQL + Redis + Kafka + Temporal              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Summary

### Core Business Modules

| Module | Features |
|--------|----------|
| **CRM** | Customers, Contacts, Deals, Pipelines, Activities |
| **Sales** | Quotes, Orders, Shipments, Price Lists |
| **Warehouse** | Products, Inventory, Movements, Batches (FIFO/LIFO/FEFO) |
| **Purchasing** | Suppliers, Purchase Orders, Receiving, Returns |
| **Finance** | Accounts, Payments, Invoices, Settlements |
| **Accounting** | Registers (1C-like), Documents, Postings, Period Closing |

### Platform Modules

| Module | Features |
|--------|----------|
| **Workflow** | Task lifecycle with approval workflow |
| **Files** | Multi-format upload, code detection, syntax highlighting |
| **AI** | Task analysis, code review, predictions, admin assistance |
| **Reports** | BI dashboards, ABC/XYZ analysis, KPIs, Cash Flow |

---

## Key Features

### 1. Task Workflow (Required)

```
NEW → IN_PROGRESS → SUBMITTED_FOR_REVIEW → ACCEPTED/REJECTED → COMPLETED

• User creates and works on tasks
• Submits for review with attachments
• Admin/Assistant reviews submissions
• Can see solution, attachments, code
• Only Admin can mark as COMPLETED
• Full history and rejection reasons
```

### 2. File Management

```
Supported:
• Code: JS/TS, Python, Go, Rust, PHP, Java, C#, C/C++, Swift, Kotlin, Ruby, Bash, SQL, HTML/CSS, YAML/JSON
• Documents: PDF, Word, Excel (.xlsx/.xls)
• Images: JPG, PNG, GIF, WebP, SVG
• Data: SQL, XML, CSV

Features:
• Auto language detection with confidence score
• Syntax highlighting for code
• Excel preview with pagination
• Binary storage in MinIO
• Code text extraction for AI analysis
```

### 3. AI Capabilities

```
Analysis:
• Task type classification
• Priority recommendations
• Code quality review
• Security vulnerability detection
• Excel data insights

Predictions:
• Sales forecasting
• Inventory demand
• Bottleneck detection

Admin Support:
• Approval recommendations
• Risk assessment
• Quality scoring
```

---

## Technology Stack

### Backend
- **Language:** Go 1.22 (or TypeScript/NestJS alternative)
- **Framework:** Gin + Wire (DI)
- **ORM:** GORM + sqlc
- **API:** gRPC + REST Gateway + GraphQL
- **Events:** Apache Kafka
- **Workflows:** Temporal.io
- **AI:** OpenAI GPT-4 + LangChain

### Frontend
- **Framework:** Next.js 14 (App Router)
- **State:** TanStack Query + Zustand
- **UI:** shadcn/ui + Tailwind CSS
- **Code:** Monaco Editor
- **Charts:** Recharts

### Infrastructure
- **Database:** PostgreSQL 16 (OLTP) + ClickHouse (OLAP)
- **Cache:** Redis Cluster
- **Search:** Elasticsearch
- **Storage:** MinIO (S3-compatible)
- **Container:** Docker + Kubernetes
- **Monitoring:** Prometheus + Grafana + Jaeger

---

## Security Architecture

```
Layer 1: Edge (WAF, DDoS, Rate Limiting)
Layer 2: API Gateway (JWT, OAuth 2.0)
Layer 3: Service Mesh (mTLS)
Layer 4: Application (RBAC, Row-Level Security)
Layer 5: Data (Encryption at Rest, Field-Level)
```

### Roles
- `SUPER_ADMIN` - Full system access
- `ADMIN` - Organization admin, can complete tasks
- `ASSISTANT` - Can review and approve/reject tasks
- `MANAGER` - Team management
- `USER` - Regular user

---

## Database Design

### Key Tables
- Identity: `organizations`, `users`, `roles`
- CRM: `customers`, `contacts`, `deals`, `pipelines`, `activities`
- Sales: `sales_orders`, `quotes`, `shipments`
- Warehouse: `products`, `stock_balances`, `batches`, `stock_movements`
- Purchasing: `suppliers`, `purchase_orders`, `goods_receipts`
- Finance: `finance_accounts`, `payments`, `invoices`
- Accounting: `chart_of_accounts`, `accumulation_registers`, `accounting_entries`
- Workflow: `tasks`, `task_transitions`, `review_queue`, `approvals`
- Files: `files`, `file_versions`, `code_analyses`
- Events: `event_streams`, `domain_events`, `audit_log`

See [03-DATABASE-SCHEMA.md](./03-DATABASE-SCHEMA.md) for full schema.

---

## API Design

### REST API Structure
```
/api/v1/auth           - Authentication
/api/v1/users          - User management
/api/v1/tasks          - Task CRUD + workflow actions
/api/v1/review-queue   - Admin review queue
/api/v1/files          - File upload/download
/api/v1/ai/*           - AI services
/api/v1/crm/*          - CRM module
/api/v1/sales/*        - Sales module
/api/v1/warehouse/*    - Warehouse module
/api/v1/finance/*      - Finance module
/api/v1/reports/*      - Reporting
```

### GraphQL
- Federation for microservices
- Subscriptions for real-time updates
- DataLoader for N+1 prevention

---

## Deployment

### Docker Compose (Development)
```bash
docker-compose -f deploy/docker/docker-compose.dev.yml up
```

### Kubernetes (Production)
```bash
kubectl apply -k deploy/kubernetes/overlays/production
```

---

## Migration Path

### Phase 1: Foundation (Weeks 1-4)
- Fix security vulnerabilities
- Implement multi-tenancy
- Set up proper authentication

### Phase 2: Refactoring (Weeks 5-8)
- Clean Architecture layers
- Repository pattern
- CQRS implementation

### Phase 3: Enterprise Features (Weeks 9-16)
- Workflow engine
- File management
- AI integration

### Phase 4: Scale (Weeks 17-24)
- Microservices migration
- Kubernetes deployment
- Monitoring stack

---

## Code Examples Location

```
/src/examples/
├── backend/
│   ├── domain/           # Domain entities and aggregates
│   ├── application/      # Use cases and handlers
│   ├── infrastructure/   # Repository implementations
│   └── interfaces/       # API handlers
└── frontend/
    ├── components/       # React components
    └── hooks/            # Custom hooks
```

---

## Contributing

1. Read architecture documentation
2. Follow DDD patterns
3. Write tests (80% coverage target)
4. Use conventional commits
5. Submit PR for review

---

**Architecture Version:** 2.0
**Last Updated:** November 2025
