# Enterprise Architecture Design
## TaskMaster ERP/CRM Platform

**Version:** 2.0
**Architecture Style:** Domain-Driven Design + Clean Architecture + CQRS + Event Sourcing

---

## 1. Architecture Principles

### 1.1 Core Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Separation of Concerns** | Each layer has single responsibility | Clean Architecture layers |
| **Dependency Inversion** | Depend on abstractions, not concretions | Interfaces in domain layer |
| **Domain-Centric** | Business logic in domain layer | Rich domain model |
| **Event-Driven** | Communicate via events | Kafka + Event Sourcing |
| **API-First** | Contract-first API design | OpenAPI + gRPC specs |
| **Security by Design** | Security in every layer | Zero-trust architecture |
| **Observable** | Full visibility into system | Metrics, traces, logs |

### 1.2 Architecture Decision Records (ADRs)

```
ADR-001: Use Go as primary backend language
  - Status: Accepted
  - Context: Need performance, simple deployment, strong typing
  - Decision: Go 1.22 with Wire for DI
  - Consequences: Learning curve, excellent performance

ADR-002: Event Sourcing for core domains
  - Status: Accepted
  - Context: Need audit trail, temporal queries, replay capability
  - Decision: Event store with projections
  - Consequences: Complexity increase, full audit capability

ADR-003: CQRS pattern
  - Status: Accepted
  - Context: Different read/write optimization needs
  - Decision: Separate command/query models
  - Consequences: Eventual consistency, scalability

ADR-004: Temporal.io for workflows
  - Status: Accepted
  - Context: Need durable, long-running workflows
  - Decision: Temporal for orchestration
  - Consequences: Additional infrastructure, reliability
```

---

## 2. Directory Structure

### 2.1 Monorepo Structure

```
taskmaster-erp/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   ├── cd-production.yml
│   │   └── security-scan.yml
│   └── CODEOWNERS
│
├── apps/                                    # Deployable applications
│   ├── api-gateway/                         # Kong/Custom gateway
│   │   ├── kong.yml
│   │   └── plugins/
│   │
│   ├── bff-web/                            # Backend for Frontend (Web)
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── graphql/
│   │   │   │   ├── schema/
│   │   │   │   ├── resolvers/
│   │   │   │   └── dataloaders/
│   │   │   └── rest/
│   │   │       ├── handlers/
│   │   │       └── middleware/
│   │   └── Dockerfile
│   │
│   ├── web/                                # Next.js Web Application
│   │   ├── src/
│   │   │   ├── app/                        # App Router pages
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── crm/
│   │   │   │   │   ├── sales/
│   │   │   │   │   ├── warehouse/
│   │   │   │   │   ├── purchasing/
│   │   │   │   │   ├── finance/
│   │   │   │   │   ├── accounting/
│   │   │   │   │   ├── workflow/
│   │   │   │   │   ├── reports/
│   │   │   │   │   └── admin/
│   │   │   │   └── api/
│   │   │   ├── components/
│   │   │   │   ├── ui/                     # shadcn/ui components
│   │   │   │   ├── forms/
│   │   │   │   ├── tables/
│   │   │   │   ├── charts/
│   │   │   │   ├── workflow/
│   │   │   │   ├── code-viewer/
│   │   │   │   └── file-upload/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   ├── lib/
│   │   │   │   ├── api/
│   │   │   │   ├── utils/
│   │   │   │   └── validations/
│   │   │   └── types/
│   │   ├── public/
│   │   └── Dockerfile
│   │
│   └── admin/                              # Admin Panel (separate app)
│       └── ...
│
├── services/                               # Microservices (Bounded Contexts)
│   │
│   ├── identity/                           # Identity & Access Management
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── user/
│   │   │   │   │   ├── entity.go
│   │   │   │   │   ├── value_objects.go
│   │   │   │   │   ├── repository.go
│   │   │   │   │   └── events.go
│   │   │   │   ├── organization/
│   │   │   │   ├── role/
│   │   │   │   └── permission/
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   ├── queries/
│   │   │   │   └── services/
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/
│   │   │   │   ├── auth/
│   │   │   │   └── external/
│   │   │   └── interfaces/
│   │   │       ├── grpc/
│   │   │       └── http/
│   │   ├── api/
│   │   │   └── proto/
│   │   └── Dockerfile
│   │
│   ├── crm/                                # CRM Context
│   │   ├── cmd/
│   │   │   └── main.go
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── customer/
│   │   │   │   │   ├── aggregate.go        # Aggregate Root
│   │   │   │   │   ├── entity.go
│   │   │   │   │   ├── value_objects.go
│   │   │   │   │   ├── repository.go
│   │   │   │   │   ├── events.go
│   │   │   │   │   └── specifications.go
│   │   │   │   ├── deal/
│   │   │   │   │   ├── aggregate.go
│   │   │   │   │   ├── state_machine.go    # Deal state transitions
│   │   │   │   │   └── ...
│   │   │   │   ├── pipeline/
│   │   │   │   ├── activity/
│   │   │   │   └── contact/
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── create_customer.go
│   │   │   │   │   ├── update_deal.go
│   │   │   │   │   └── ...
│   │   │   │   ├── queries/
│   │   │   │   │   ├── get_customer.go
│   │   │   │   │   ├── list_deals.go
│   │   │   │   │   └── ...
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── command_handlers.go
│   │   │   │   │   └── event_handlers.go
│   │   │   │   └── services/
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/
│   │   │   │   │   ├── postgres/
│   │   │   │   │   │   ├── customer_repository.go
│   │   │   │   │   │   └── deal_repository.go
│   │   │   │   │   └── eventstore/
│   │   │   │   ├── messaging/
│   │   │   │   │   └── kafka/
│   │   │   │   └── external/
│   │   │   └── interfaces/
│   │   │       ├── grpc/
│   │   │       │   ├── server.go
│   │   │       │   └── handlers/
│   │   │       └── http/
│   │   ├── api/
│   │   │   └── proto/
│   │   │       └── crm.proto
│   │   └── Dockerfile
│   │
│   ├── sales/                              # Sales Context
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── quote/                  # Commercial proposals
│   │   │   │   ├── order/                  # Sales orders
│   │   │   │   ├── shipment/               # Deliveries
│   │   │   │   └── price_list/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   └── ...
│   │
│   ├── warehouse/                          # Warehouse Context
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── product/
│   │   │   │   │   ├── aggregate.go
│   │   │   │   │   ├── entity.go
│   │   │   │   │   └── ...
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── stock_balance.go
│   │   │   │   │   ├── reservation.go
│   │   │   │   │   └── movement.go
│   │   │   │   ├── receipt/                # Goods receipt
│   │   │   │   ├── writeoff/               # Write-offs
│   │   │   │   └── batch/                  # FIFO/LIFO/FEFO
│   │   │   │       ├── batch.go
│   │   │   │       ├── fifo_strategy.go
│   │   │   │       ├── lifo_strategy.go
│   │   │   │       └── fefo_strategy.go
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── purchasing/                         # Purchasing Context
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── supplier/
│   │   │   │   ├── purchase_order/
│   │   │   │   ├── receiving/
│   │   │   │   └── return/
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── finance/                            # Finance Context
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── account/
│   │   │   │   │   ├── aggregate.go
│   │   │   │   │   ├── ledger.go
│   │   │   │   │   └── ...
│   │   │   │   ├── payment/
│   │   │   │   ├── invoice/
│   │   │   │   └── settlement/             # Mutual settlements
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── accounting/                         # Accounting Context (1C-like)
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── register/               # Accounting registers
│   │   │   │   │   ├── accumulation.go     # Накопительные регистры
│   │   │   │   │   ├── information.go      # Информационные регистры
│   │   │   │   │   └── accounting.go       # Бухгалтерские регистры
│   │   │   │   ├── document/
│   │   │   │   │   ├── base_document.go
│   │   │   │   │   ├── posting.go          # Проводки
│   │   │   │   │   └── ...
│   │   │   │   ├── chart_of_accounts/
│   │   │   │   ├── period/
│   │   │   │   │   ├── period.go
│   │   │   │   │   └── closing.go          # Period closing
│   │   │   │   └── report/
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── workflow/                           # Workflow Engine Context
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── task/
│   │   │   │   │   ├── aggregate.go
│   │   │   │   │   ├── state_machine.go    # Task lifecycle
│   │   │   │   │   ├── transition.go
│   │   │   │   │   └── events.go
│   │   │   │   ├── approval/
│   │   │   │   │   ├── approval_chain.go
│   │   │   │   │   └── decision.go
│   │   │   │   ├── review_queue/
│   │   │   │   └── notification/
│   │   │   ├── application/
│   │   │   │   ├── workflows/              # Temporal workflows
│   │   │   │   │   ├── task_workflow.go
│   │   │   │   │   └── approval_workflow.go
│   │   │   │   └── activities/
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── files/                              # File Management Context
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── file/
│   │   │   │   │   ├── entity.go
│   │   │   │   │   ├── metadata.go
│   │   │   │   │   └── ...
│   │   │   │   └── code_analysis/
│   │   │   │       ├── detector.go         # Language detection
│   │   │   │       ├── parser.go
│   │   │   │       └── highlighter.go
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── ai/                                 # AI/ML Context
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── task_analyzer.go
│   │   │   │   │   ├── code_reviewer.go
│   │   │   │   │   └── document_analyzer.go
│   │   │   │   ├── prediction/
│   │   │   │   │   ├── sales_forecast.go
│   │   │   │   │   ├── inventory_demand.go
│   │   │   │   │   └── anomaly_detection.go
│   │   │   │   └── generation/
│   │   │   │       ├── report_generator.go
│   │   │   │       └── document_generator.go
│   │   │   ├── application/
│   │   │   │   ├── pipelines/
│   │   │   │   │   ├── llm_pipeline.go
│   │   │   │   │   └── ml_pipeline.go
│   │   │   │   └── services/
│   │   │   └── infrastructure/
│   │   │       ├── openai/
│   │   │       ├── langchain/
│   │   │       └── vector_store/
│   │   └── ...
│   │
│   ├── reports/                            # Reporting Context
│   │   ├── internal/
│   │   │   ├── domain/
│   │   │   │   ├── bi/
│   │   │   │   │   ├── dashboard.go
│   │   │   │   │   └── widget.go
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── abc_analysis.go
│   │   │   │   │   ├── xyz_analysis.go
│   │   │   │   │   └── kpi.go
│   │   │   │   └── financial/
│   │   │   │       ├── cash_flow.go        # ДДС
│   │   │   │       ├── pnl.go              # P&L
│   │   │   │       └── balance.go
│   │   │   └── ...
│   │   └── ...
│   │
│   └── notifications/                      # Notification Context
│       ├── internal/
│       │   ├── domain/
│       │   │   ├── notification.go
│       │   │   └── channel/
│       │   │       ├── email.go
│       │   │       ├── push.go
│       │   │       ├── websocket.go
│       │   │       └── telegram.go
│       │   └── ...
│       └── ...
│
├── pkg/                                    # Shared Libraries
│   ├── domain/                             # Shared domain primitives
│   │   ├── aggregate_root.go
│   │   ├── entity.go
│   │   ├── value_object.go
│   │   ├── domain_event.go
│   │   └── specification.go
│   │
│   ├── cqrs/                               # CQRS infrastructure
│   │   ├── command.go
│   │   ├── query.go
│   │   ├── command_bus.go
│   │   └── query_bus.go
│   │
│   ├── eventsourcing/                      # Event Sourcing
│   │   ├── event_store.go
│   │   ├── snapshot.go
│   │   └── projection.go
│   │
│   ├── errors/                             # Error handling
│   │   ├── domain_error.go
│   │   ├── application_error.go
│   │   └── codes.go
│   │
│   ├── pagination/                         # Pagination utilities
│   │   └── cursor.go
│   │
│   ├── auth/                               # Auth utilities
│   │   ├── jwt.go
│   │   ├── rbac.go
│   │   └── context.go
│   │
│   ├── logging/                            # Structured logging
│   │   └── logger.go
│   │
│   ├── tracing/                            # Distributed tracing
│   │   └── tracer.go
│   │
│   └── testing/                            # Test utilities
│       ├── fixtures/
│       └── mocks/
│
├── proto/                                  # Shared protobuf definitions
│   ├── common/
│   │   ├── pagination.proto
│   │   ├── money.proto
│   │   └── timestamp.proto
│   └── events/
│       └── domain_events.proto
│
├── migrations/                             # Database migrations
│   ├── postgres/
│   │   ├── 000001_init_schema.up.sql
│   │   ├── 000001_init_schema.down.sql
│   │   └── ...
│   └── clickhouse/
│       └── ...
│
├── deploy/                                 # Deployment configurations
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   ├── kubernetes/
│   │   ├── base/
│   │   ├── overlays/
│   │   │   ├── development/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── helm/
│   └── terraform/
│       ├── modules/
│       └── environments/
│
├── scripts/                                # Development scripts
│   ├── setup.sh
│   ├── generate-proto.sh
│   └── seed-data.sh
│
├── docs/                                   # Documentation
│   ├── architecture/
│   │   ├── 01-AUDIT-REPORT.md
│   │   ├── 02-ARCHITECTURE-DESIGN.md
│   │   ├── 03-DATABASE-SCHEMA.md
│   │   └── ...
│   ├── api/
│   │   ├── openapi.yaml
│   │   └── graphql.md
│   ├── modules/
│   │   ├── crm.md
│   │   ├── sales.md
│   │   └── ...
│   └── runbooks/
│
├── tools/                                  # Development tools
│   ├── codegen/
│   └── linters/
│
├── go.mod
├── go.sum
├── Makefile
├── README.md
└── .env.example
```

---

## 3. Layer Responsibilities

### 3.1 Domain Layer

```go
// pkg/domain/aggregate_root.go
package domain

import "time"

// AggregateRoot is the base for all aggregate roots
type AggregateRoot struct {
    ID        string
    Version   int64
    CreatedAt time.Time
    UpdatedAt time.Time
    events    []DomainEvent
}

func (a *AggregateRoot) AddDomainEvent(event DomainEvent) {
    a.events = append(a.events, event)
}

func (a *AggregateRoot) GetDomainEvents() []DomainEvent {
    return a.events
}

func (a *AggregateRoot) ClearDomainEvents() {
    a.events = nil
}

// DomainEvent represents something that happened in the domain
type DomainEvent interface {
    EventType() string
    AggregateID() string
    OccurredAt() time.Time
}

// Entity is the base for all entities
type Entity struct {
    ID string
}

// ValueObject marker interface
type ValueObject interface {
    Equals(other ValueObject) bool
}

// Specification pattern for business rules
type Specification[T any] interface {
    IsSatisfiedBy(entity T) bool
    And(other Specification[T]) Specification[T]
    Or(other Specification[T]) Specification[T]
    Not() Specification[T]
}
```

### 3.2 Application Layer

```go
// pkg/cqrs/command.go
package cqrs

import "context"

// Command represents an intent to change state
type Command interface {
    CommandName() string
}

// CommandHandler handles a specific command
type CommandHandler[C Command] interface {
    Handle(ctx context.Context, cmd C) error
}

// CommandBus dispatches commands to handlers
type CommandBus interface {
    Dispatch(ctx context.Context, cmd Command) error
    Register(cmdName string, handler any)
}

// Query represents a request for data
type Query interface {
    QueryName() string
}

// QueryHandler handles a specific query
type QueryHandler[Q Query, R any] interface {
    Handle(ctx context.Context, query Q) (R, error)
}

// QueryBus dispatches queries to handlers
type QueryBus interface {
    Execute(ctx context.Context, query Query) (any, error)
    Register(queryName string, handler any)
}
```

### 3.3 Infrastructure Layer

```go
// Implements repository interfaces defined in domain
// Handles persistence, messaging, external APIs

// Example: services/crm/internal/infrastructure/persistence/postgres/customer_repository.go
package postgres

import (
    "context"
    "github.com/taskmaster/services/crm/internal/domain/customer"
    "gorm.io/gorm"
)

type CustomerRepository struct {
    db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
    return &CustomerRepository{db: db}
}

func (r *CustomerRepository) FindByID(ctx context.Context, id string) (*customer.Customer, error) {
    var model CustomerModel
    if err := r.db.WithContext(ctx).First(&model, "id = ?", id).Error; err != nil {
        return nil, err
    }
    return model.ToDomain(), nil
}

func (r *CustomerRepository) Save(ctx context.Context, c *customer.Customer) error {
    model := NewCustomerModel(c)
    return r.db.WithContext(ctx).Save(&model).Error
}
```

---

## 4. Communication Patterns

### 4.1 Synchronous (gRPC)

```
┌─────────────┐    gRPC     ┌─────────────┐
│   Service A │────────────►│   Service B │
│   (Sales)   │◄────────────│ (Warehouse) │
└─────────────┘             └─────────────┘

Use cases:
- Real-time inventory check
- Price calculation
- User validation
```

### 4.2 Asynchronous (Kafka Events)

```
┌─────────────┐              ┌──────────────┐
│   Service A │──publish────►│    Kafka     │
│   (Sales)   │              │    Topic     │
└─────────────┘              └──────┬───────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
             ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
             │  Warehouse  │ │   Finance   │ │     AI      │
             │  (Reserve)  │ │ (Invoice)   │ │  (Analyze)  │
             └─────────────┘ └─────────────┘ └─────────────┘

Use cases:
- Order created → reserve inventory
- Order shipped → create invoice
- Task completed → AI analysis
```

### 4.3 Request-Reply (Temporal Workflows)

```
┌─────────────────────────────────────────────────────────────┐
│                    Temporal Workflow                         │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │ Create  │──►│ Reserve │──►│  Ship   │──►│ Invoice │     │
│  │  Order  │   │  Stock  │   │  Goods  │   │  Create │     │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│       │            │             │             │            │
│       ▼            ▼             ▼             ▼            │
│  [Compensation: Cancel → Release → Return → Void]          │
└─────────────────────────────────────────────────────────────┘

Use cases:
- Order fulfillment saga
- Task approval workflow
- Period closing process
```

---

## 5. Security Architecture

### 5.1 Zero Trust Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Layer 1: Edge Security                                                 │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  WAF • DDoS Protection • Rate Limiting • Bot Detection            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                   │                                     │
│  Layer 2: API Gateway                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  JWT Validation • OAuth 2.0 • API Key Management • Request Audit  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                   │                                     │
│  Layer 3: Service Mesh (mTLS)                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Service-to-Service Auth • Encryption in Transit • Policy Engine  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                   │                                     │
│  Layer 4: Application Security                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  RBAC • Row-Level Security • Input Validation • Output Encoding   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                   │                                     │
│  Layer 5: Data Security                                                │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Encryption at Rest • Field-Level Encryption • Key Rotation       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Authentication Flow

```
┌──────┐     ┌────────────┐     ┌──────────────┐     ┌─────────────┐
│Client│────►│API Gateway │────►│   Identity   │────►│   Service   │
└──────┘     └────────────┘     │   Service    │     └─────────────┘
                                └──────────────┘
   │              │                    │                    │
   │   1. Login   │                    │                    │
   │─────────────►│                    │                    │
   │              │  2. Validate       │                    │
   │              │───────────────────►│                    │
   │              │  3. JWT + Refresh  │                    │
   │              │◄───────────────────│                    │
   │  4. Tokens   │                    │                    │
   │◄─────────────│                    │                    │
   │              │                    │                    │
   │ 5. API Call  │                    │                    │
   │─────────────►│                    │                    │
   │              │ 6. Verify JWT      │                    │
   │              │───────────────────►│                    │
   │              │ 7. Claims          │                    │
   │              │◄───────────────────│                    │
   │              │                    │  8. Forward        │
   │              │────────────────────────────────────────►│
   │              │                    │  9. Response       │
   │ 10. Response │◄────────────────────────────────────────│
   │◄─────────────│                    │                    │
```

### 5.3 Authorization (RBAC + ABAC)

```go
// pkg/auth/rbac.go
package auth

type Role string

const (
    RoleSuperAdmin  Role = "SUPER_ADMIN"
    RoleAdmin       Role = "ADMIN"
    RoleManager     Role = "MANAGER"
    RoleAssistant   Role = "ASSISTANT"
    RoleUser        Role = "USER"
)

type Permission string

const (
    // Task permissions
    PermTaskCreate    Permission = "task:create"
    PermTaskRead      Permission = "task:read"
    PermTaskUpdate    Permission = "task:update"
    PermTaskDelete    Permission = "task:delete"
    PermTaskApprove   Permission = "task:approve"
    PermTaskComplete  Permission = "task:complete"  // Only admin

    // CRM permissions
    PermCustomerManage Permission = "customer:manage"
    PermDealManage     Permission = "deal:manage"

    // Report permissions
    PermReportView     Permission = "report:view"
    PermReportExport   Permission = "report:export"
)

// Role-Permission mapping
var RolePermissions = map[Role][]Permission{
    RoleSuperAdmin: {/* all permissions */},
    RoleAdmin: {
        PermTaskCreate, PermTaskRead, PermTaskUpdate, PermTaskDelete,
        PermTaskApprove, PermTaskComplete,
        PermCustomerManage, PermDealManage,
        PermReportView, PermReportExport,
    },
    RoleAssistant: {
        PermTaskRead, PermTaskApprove,
        PermReportView,
    },
    RoleUser: {
        PermTaskCreate, PermTaskRead, PermTaskUpdate,
    },
}
```

---

## 6. Observability Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OBSERVABILITY STACK                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         GRAFANA                                  │   │
│  │        Unified Dashboard • Alerts • Annotations                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│            │                    │                    │                  │
│            ▼                    ▼                    ▼                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │
│  │   Prometheus    │ │     Jaeger      │ │   Loki/ELK      │          │
│  │    (Metrics)    │ │   (Tracing)     │ │   (Logging)     │          │
│  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘          │
│           │                   │                    │                    │
│           └───────────────────┼────────────────────┘                    │
│                               │                                         │
│  ┌────────────────────────────┴────────────────────────────────────┐   │
│  │                    OpenTelemetry Collector                       │   │
│  │           Auto-instrumentation • Context Propagation             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                               │                                         │
│  ┌────────────────────────────┴────────────────────────────────────┐   │
│  │                         Applications                             │   │
│  │    [Service A] [Service B] [Service C] [Service D] [Service E]   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Deployment Architecture

### 7.1 Kubernetes Deployment

```yaml
# deploy/kubernetes/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crm-service
  labels:
    app: crm-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: crm-service
  template:
    metadata:
      labels:
        app: crm-service
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: crm-service
      containers:
      - name: crm-service
        image: taskmaster/crm-service:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: grpc
        - containerPort: 9091
          name: metrics
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: crm-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 7.2 Service Mesh Configuration

```yaml
# Istio VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: crm-service
spec:
  hosts:
  - crm-service
  http:
  - match:
    - headers:
        x-api-version:
          exact: "v2"
    route:
    - destination:
        host: crm-service
        subset: v2
  - route:
    - destination:
        host: crm-service
        subset: v1
      weight: 90
    - destination:
        host: crm-service
        subset: v2
      weight: 10
    retries:
      attempts: 3
      perTryTimeout: 2s
    timeout: 10s
```

---

## 8. Benefits Summary

| Aspect | Benefit |
|--------|---------|
| **Maintainability** | Clear boundaries, single responsibility |
| **Testability** | Isolated layers, dependency injection |
| **Scalability** | Independent service scaling |
| **Flexibility** | Easy to add/modify features |
| **Security** | Defense in depth |
| **Observability** | Full stack visibility |
| **Resilience** | Circuit breakers, retries, sagas |
| **Evolution** | Strangler fig migration path |

---

**Document Version:** 2.0
**Next:** Database Schema Design
