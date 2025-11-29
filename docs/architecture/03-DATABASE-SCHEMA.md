# Database Schema Design
## Enterprise ERP/CRM Platform

**Version:** 2.0
**Database:** PostgreSQL 16 (OLTP) + ClickHouse (OLAP) + Redis (Cache)

---

## 1. Database Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      WRITE PATH (Commands)                          │   │
│  │                                                                     │   │
│  │   Application ──► Event Store ──► PostgreSQL (OLTP)                │   │
│  │                        │                                           │   │
│  │                        ▼                                           │   │
│  │                   Domain Events ──► Kafka ──► Projections          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      READ PATH (Queries)                            │   │
│  │                                                                     │   │
│  │   Application ──► Cache (Redis) ──► Read Replicas (PostgreSQL)     │   │
│  │                        │                                           │   │
│  │                        └──► ClickHouse (Analytics/OLAP)            │   │
│  │                        │                                           │   │
│  │                        └──► Elasticsearch (Full-text Search)       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SPECIALIZED STORES                             │   │
│  │                                                                     │   │
│  │   MinIO (Files) │ TimescaleDB (Time Series) │ pgvector (Vectors)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ER Diagram (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         ENTITY RELATIONSHIP DIAGRAM                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│   IDENTITY CONTEXT                                                                                      │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                                 │
│   │   Organization   │───<│       User       │>───│       Role       │                                 │
│   │──────────────────│    │──────────────────│    │──────────────────│                                 │
│   │ id               │    │ id               │    │ id               │                                 │
│   │ name             │    │ organization_id  │    │ name             │                                 │
│   │ settings (JSON)  │    │ email            │    │ permissions[]    │                                 │
│   │ plan_type        │    │ password_hash    │    └──────────────────┘                                 │
│   └──────────────────┘    │ role_id          │                                                         │
│           │               │ profile (JSON)   │                                                         │
│           │               └──────────────────┘                                                         │
│           │                       │                                                                     │
│   ┌───────┴───────────────────────┴─────────────────────────────────────────┐                          │
│   │                                                                         │                          │
│   │   CRM CONTEXT                                                           │                          │
│   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐ │                          │
│   │   │     Customer     │───<│       Deal       │───>│     Pipeline     │ │                          │
│   │   │──────────────────│    │──────────────────│    │──────────────────│ │                          │
│   │   │ id               │    │ id               │    │ id               │ │                          │
│   │   │ organization_id  │    │ customer_id      │    │ organization_id  │ │                          │
│   │   │ type (COMPANY/   │    │ pipeline_id      │    │ name             │ │                          │
│   │   │      INDIVIDUAL) │    │ stage_id         │    │ stages[]         │ │                          │
│   │   │ name             │    │ title            │    └──────────────────┘ │                          │
│   │   │ contacts[]       │    │ amount           │            │            │                          │
│   │   │ addresses[]      │    │ probability      │            ▼            │                          │
│   │   │ tags[]           │    │ close_date       │    ┌──────────────────┐ │                          │
│   │   └──────────────────┘    │ status           │    │   PipelineStage  │ │                          │
│   │           │               │ assigned_to      │    │──────────────────│ │                          │
│   │           │               └──────────────────┘    │ id               │ │                          │
│   │           │                       │               │ pipeline_id      │ │                          │
│   │           ▼                       ▼               │ name             │ │                          │
│   │   ┌──────────────────┐    ┌──────────────────┐   │ order            │ │                          │
│   │   │     Contact      │    │     Activity     │   │ win_probability  │ │                          │
│   │   │──────────────────│    │──────────────────│   └──────────────────┘ │                          │
│   │   │ id               │    │ id               │                        │                          │
│   │   │ customer_id      │    │ type (CALL/EMAIL/│                        │                          │
│   │   │ first_name       │    │      MEETING/    │                        │                          │
│   │   │ last_name        │    │      NOTE)       │                        │                          │
│   │   │ email            │    │ entity_type      │                        │                          │
│   │   │ phone            │    │ entity_id        │                        │                          │
│   │   │ position         │    │ description      │                        │                          │
│   │   │ is_primary       │    │ scheduled_at     │                        │                          │
│   │   └──────────────────┘    │ completed_at     │                        │                          │
│   │                           └──────────────────┘                        │                          │
│   └───────────────────────────────────────────────────────────────────────┘                          │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   SALES CONTEXT                                                                                 │ │
│   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐ │ │
│   │   │      Quote       │───>│   SalesOrder     │───>│     Shipment     │───>│   ShipmentLine   │ │ │
│   │   │──────────────────│    │──────────────────│    │──────────────────│    │──────────────────│ │ │
│   │   │ id               │    │ id               │    │ id               │    │ id               │ │ │
│   │   │ number           │    │ number           │    │ number           │    │ shipment_id      │ │ │
│   │   │ customer_id      │    │ customer_id      │    │ order_id         │    │ product_id       │ │ │
│   │   │ deal_id          │    │ quote_id         │    │ warehouse_id     │    │ batch_id         │ │ │
│   │   │ valid_until      │    │ status           │    │ status           │    │ quantity         │ │ │
│   │   │ status           │    │ shipping_address │    │ shipped_at       │    │ unit_price       │ │ │
│   │   │ total_amount     │    │ total_amount     │    │ tracking_number  │    └──────────────────┘ │ │
│   │   │ lines[]          │    │ lines[]          │    └──────────────────┘                        │ │
│   │   └──────────────────┘    └──────────────────┘                                                │ │
│   │           │                       │                                                            │ │
│   │           ▼                       ▼                                                            │ │
│   │   ┌──────────────────┐    ┌──────────────────┐                                                │ │
│   │   │    QuoteLine     │    │  SalesOrderLine  │                                                │ │
│   │   │──────────────────│    │──────────────────│                                                │ │
│   │   │ id               │    │ id               │                                                │ │
│   │   │ quote_id         │    │ order_id         │                                                │ │
│   │   │ product_id       │    │ product_id       │                                                │ │
│   │   │ quantity         │    │ quantity         │                                                │ │
│   │   │ unit_price       │    │ shipped_qty      │                                                │ │
│   │   │ discount_percent │    │ unit_price       │                                                │ │
│   │   └──────────────────┘    │ discount_percent │                                                │ │
│   │                           └──────────────────┘                                                │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   WAREHOUSE CONTEXT                                                                             │ │
│   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐ │ │
│   │   │     Product      │───<│   StockBalance   │>───│    Warehouse     │    │      Batch       │ │ │
│   │   │──────────────────│    │──────────────────│    │──────────────────│    │──────────────────│ │ │
│   │   │ id               │    │ id               │    │ id               │    │ id               │ │ │
│   │   │ sku              │    │ product_id       │    │ organization_id  │    │ product_id       │ │ │
│   │   │ name             │    │ warehouse_id     │    │ name             │    │ warehouse_id     │ │ │
│   │   │ category_id      │    │ batch_id         │    │ address          │    │ number           │ │ │
│   │   │ unit_of_measure  │    │ quantity         │    │ is_active        │    │ quantity         │ │ │
│   │   │ barcode          │    │ reserved_qty     │    └──────────────────┘    │ cost_price       │ │ │
│   │   │ min_stock        │    │ updated_at       │                            │ production_date  │ │ │
│   │   │ max_stock        │    └──────────────────┘                            │ expiry_date      │ │ │
│   │   │ is_active        │                                                    │ status           │ │ │
│   │   └──────────────────┘                                                    └──────────────────┘ │ │
│   │           │                                                                       │            │ │
│   │           │               ┌──────────────────┐                                   │            │ │
│   │           └──────────────>│  StockMovement   │<──────────────────────────────────┘            │ │
│   │                           │──────────────────│                                                │ │
│   │                           │ id               │                                                │ │
│   │                           │ type (IN/OUT/    │                                                │ │
│   │                           │      TRANSFER/   │                                                │ │
│   │                           │      ADJUSTMENT) │                                                │ │
│   │                           │ product_id       │                                                │ │
│   │                           │ from_warehouse   │                                                │ │
│   │                           │ to_warehouse     │                                                │ │
│   │                           │ batch_id         │                                                │ │
│   │                           │ quantity         │                                                │ │
│   │                           │ document_type    │                                                │ │
│   │                           │ document_id      │                                                │ │
│   │                           │ created_at       │                                                │ │
│   │                           └──────────────────┘                                                │ │
│   │                                                                                                │ │
│   │   ┌──────────────────┐    ┌──────────────────┐                                                │ │
│   │   │   GoodsReceipt   │    │    WriteOff      │                                                │ │
│   │   │──────────────────│    │──────────────────│                                                │ │
│   │   │ id               │    │ id               │                                                │ │
│   │   │ number           │    │ number           │                                                │ │
│   │   │ supplier_id      │    │ warehouse_id     │                                                │ │
│   │   │ warehouse_id     │    │ reason           │                                                │ │
│   │   │ status           │    │ status           │                                                │ │
│   │   │ lines[]          │    │ lines[]          │                                                │ │
│   │   └──────────────────┘    └──────────────────┘                                                │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   PURCHASING CONTEXT                                                                            │ │
│   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                        │ │
│   │   │     Supplier     │───<│  PurchaseOrder   │───>│ PurchaseReturn   │                        │ │
│   │   │──────────────────│    │──────────────────│    │──────────────────│                        │ │
│   │   │ id               │    │ id               │    │ id               │                        │ │
│   │   │ organization_id  │    │ number           │    │ number           │                        │ │
│   │   │ name             │    │ supplier_id      │    │ purchase_order_id│                        │ │
│   │   │ contacts[]       │    │ status           │    │ reason           │                        │ │
│   │   │ payment_terms    │    │ expected_date    │    │ status           │                        │ │
│   │   │ rating           │    │ total_amount     │    │ lines[]          │                        │ │
│   │   │ is_active        │    │ lines[]          │    └──────────────────┘                        │ │
│   │   └──────────────────┘    └──────────────────┘                                                │ │
│   │                                   │                                                            │ │
│   │                                   ▼                                                            │ │
│   │                           ┌──────────────────┐                                                │ │
│   │                           │PurchaseOrderLine │                                                │ │
│   │                           │──────────────────│                                                │ │
│   │                           │ id               │                                                │ │
│   │                           │ order_id         │                                                │ │
│   │                           │ product_id       │                                                │ │
│   │                           │ quantity         │                                                │ │
│   │                           │ received_qty     │                                                │ │
│   │                           │ unit_price       │                                                │ │
│   │                           └──────────────────┘                                                │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   FINANCE CONTEXT                                                                               │ │
│   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                        │ │
│   │   │     Account      │───<│     Payment      │    │     Invoice      │                        │ │
│   │   │──────────────────│    │──────────────────│    │──────────────────│                        │ │
│   │   │ id               │    │ id               │    │ id               │                        │ │
│   │   │ organization_id  │    │ number           │    │ number           │                        │ │
│   │   │ type (BANK/CASH/ │    │ account_id       │    │ type (SALE/      │                        │ │
│   │   │      VIRTUAL)    │    │ type (IN/OUT)    │    │      PURCHASE)   │                        │ │
│   │   │ currency         │    │ amount           │    │ entity_type      │                        │ │
│   │   │ balance          │    │ counterparty_id  │    │ entity_id        │                        │ │
│   │   │ is_active        │    │ reference_type   │    │ amount           │                        │ │
│   │   └──────────────────┘    │ reference_id     │    │ paid_amount      │                        │ │
│   │                           │ status           │    │ due_date         │                        │ │
│   │                           │ paid_at          │    │ status           │                        │ │
│   │                           └──────────────────┘    └──────────────────┘                        │ │
│   │                                                                                                │ │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│   │   │                              Settlement (Взаиморасчёты)                                 │ │ │
│   │   │   ┌──────────────────┐    ┌──────────────────┐                                         │ │ │
│   │   │   │ CounterpartyDebt │    │   Reconciliation │                                         │ │ │
│   │   │   │──────────────────│    │──────────────────│                                         │ │ │
│   │   │   │ id               │    │ id               │                                         │ │ │
│   │   │   │ counterparty_id  │    │ counterparty_id  │                                         │ │ │
│   │   │   │ document_type    │    │ period_start     │                                         │ │ │
│   │   │   │ document_id      │    │ period_end       │                                         │ │ │
│   │   │   │ amount           │    │ our_balance      │                                         │ │ │
│   │   │   │ currency         │    │ their_balance    │                                         │ │ │
│   │   │   │ due_date         │    │ difference       │                                         │ │ │
│   │   │   │ status           │    │ status           │                                         │ │ │
│   │   │   └──────────────────┘    └──────────────────┘                                         │ │ │
│   │   └─────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   ACCOUNTING CONTEXT (1C-like)                                                                  │ │
│   │                                                                                                 │ │
│   │   ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│   │   │                           Chart of Accounts (План счетов)                                │ │ │
│   │   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                  │ │ │
│   │   │   │ ChartOfAccounts  │───>│     Account      │───<│   SubAccount     │                  │ │ │
│   │   │   │──────────────────│    │──────────────────│    │──────────────────│                  │ │ │
│   │   │   │ id               │    │ id               │    │ id               │                  │ │ │
│   │   │   │ organization_id  │    │ chart_id         │    │ account_id       │                  │ │ │
│   │   │   │ name             │    │ code             │    │ dimension_type   │                  │ │ │
│   │   │   │ version          │    │ name             │    │ dimension_id     │                  │ │ │
│   │   │   └──────────────────┘    │ type (ACTIVE/    │    │ balance          │                  │ │ │
│   │   │                           │      PASSIVE/    │    └──────────────────┘                  │ │ │
│   │   │                           │      ACTIVE_     │                                          │ │ │
│   │   │                           │      PASSIVE)    │                                          │ │ │
│   │   │                           │ parent_id        │                                          │ │ │
│   │   │                           │ is_leaf          │                                          │ │ │
│   │   │                           └──────────────────┘                                          │ │ │
│   │   └──────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│   │                                                                                                 │ │
│   │   ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│   │   │                           Registers (Регистры - как в 1С)                                │ │ │
│   │   │                                                                                          │ │ │
│   │   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                  │ │ │
│   │   │   │  Accumulation    │    │   Information    │    │   Accounting     │                  │ │ │
│   │   │   │    Register      │    │    Register      │    │    Register      │                  │ │ │
│   │   │   │──────────────────│    │──────────────────│    │──────────────────│                  │ │ │
│   │   │   │ period           │    │ id               │    │ id               │                  │ │ │
│   │   │   │ document_type    │    │ dimension_keys   │    │ period           │                  │ │ │
│   │   │   │ document_id      │    │ resource_values  │    │ document_type    │                  │ │ │
│   │   │   │ dimensions       │    │ valid_from       │    │ document_id      │                  │ │ │
│   │   │   │ resources        │    │ valid_to         │    │ debit_account    │                  │ │ │
│   │   │   │ attributes       │    └──────────────────┘    │ credit_account   │                  │ │ │
│   │   │   │ movement_type    │                            │ amount           │                  │ │ │
│   │   │   │  (INCOME/EXPENSE)│                            │ currency         │                  │ │ │
│   │   │   └──────────────────┘                            │ analytics        │                  │ │ │
│   │   │                                                   └──────────────────┘                  │ │ │
│   │   │   Examples:                                                                              │ │ │
│   │   │   - Остатки товаров (Accumulation: product, warehouse, batch → quantity, cost)          │ │ │
│   │   │   - Взаиморасчёты (Accumulation: counterparty, contract → debt)                        │ │ │
│   │   │   - Курсы валют (Information: currency, date → rate)                                    │ │ │
│   │   │   - Бухгалтерские проводки (Accounting: debit/credit accounts, dimensions → amount)    │ │ │
│   │   └──────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│   │                                                                                                 │ │
│   │   ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│   │   │                           Documents (Документы)                                          │ │ │
│   │   │   ┌──────────────────┐    ┌──────────────────┐                                          │ │ │
│   │   │   │ AccountingDoc    │───>│     Posting      │                                          │ │ │
│   │   │   │──────────────────│    │──────────────────│                                          │ │ │
│   │   │   │ id               │    │ id               │                                          │ │ │
│   │   │   │ number           │    │ document_id      │                                          │ │ │
│   │   │   │ date             │    │ line_number      │                                          │ │ │
│   │   │   │ type             │    │ debit_account    │                                          │ │ │
│   │   │   │ status           │    │ credit_account   │                                          │ │ │
│   │   │   │ posted_at        │    │ amount           │                                          │ │ │
│   │   │   │ reversed_at      │    │ quantity         │                                          │ │ │
│   │   │   └──────────────────┘    │ analytics (JSON) │                                          │ │ │
│   │   │                           └──────────────────┘                                          │ │ │
│   │   └──────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│   │                                                                                                 │ │
│   │   ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│   │   │                           Period Closing (Закрытие периода)                             │ │ │
│   │   │   ┌──────────────────┐    ┌──────────────────┐                                          │ │ │
│   │   │   │  AccountingPeriod│───>│   ClosingTask    │                                          │ │ │
│   │   │   │──────────────────│    │──────────────────│                                          │ │ │
│   │   │   │ id               │    │ id               │                                          │ │ │
│   │   │   │ organization_id  │    │ period_id        │                                          │ │ │
│   │   │   │ year             │    │ type (INVENTORY/ │                                          │ │ │
│   │   │   │ month            │    │      DEPRECIATION│                                          │ │ │
│   │   │   │ status           │    │      COST_ALLOC/ │                                          │ │ │
│   │   │   │ closed_at        │    │      REVALUATION)│                                          │ │ │
│   │   │   │ closed_by        │    │ status           │                                          │ │ │
│   │   │   └──────────────────┘    │ executed_at      │                                          │ │ │
│   │   │                           └──────────────────┘                                          │ │ │
│   │   └──────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   WORKFLOW CONTEXT                                                                              │ │
│   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐ │ │
│   │   │      Task        │───>│  TaskTransition  │    │   ReviewQueue    │    │    Approval      │ │ │
│   │   │──────────────────│    │──────────────────│    │──────────────────│    │──────────────────│ │ │
│   │   │ id               │    │ id               │    │ id               │    │ id               │ │ │
│   │   │ organization_id  │    │ task_id          │    │ task_id          │    │ task_id          │ │ │
│   │   │ title            │    │ from_status      │    │ priority         │    │ approver_id      │ │ │
│   │   │ description      │    │ to_status        │    │ assigned_to      │    │ status           │ │ │
│   │   │ status           │    │ triggered_by     │    │ created_at       │    │ decision         │ │ │
│   │   │ creator_id       │    │ reason           │    │ claimed_at       │    │ reason           │ │ │
│   │   │ assignee_id      │    │ created_at       │    └──────────────────┘    │ decided_at       │ │ │
│   │   │ due_date         │    └──────────────────┘                            └──────────────────┘ │ │
│   │   │ attachments[]    │                                                                        │ │
│   │   │ submission_data  │    Task Statuses:                                                      │ │
│   │   └──────────────────┘    • NEW → IN_PROGRESS → SUBMITTED_FOR_REVIEW → ACCEPTED/REJECTED     │ │
│   │                           • ACCEPTED → COMPLETED (only by admin)                              │ │
│   │                           • REJECTED → IN_PROGRESS (back to user)                             │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   FILES CONTEXT                                                                                 │ │
│   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                        │ │
│   │   │       File       │───>│   FileVersion    │    │   CodeAnalysis   │                        │ │
│   │   │──────────────────│    │──────────────────│    │──────────────────│                        │ │
│   │   │ id               │    │ id               │    │ id               │                        │ │
│   │   │ organization_id  │    │ file_id          │    │ file_version_id  │                        │ │
│   │   │ entity_type      │    │ version_number   │    │ language         │                        │ │
│   │   │ entity_id        │    │ storage_path     │    │ is_code          │                        │ │
│   │   │ filename         │    │ size             │    │ confidence       │                        │ │
│   │   │ mime_type        │    │ checksum         │    │ tokens[]         │                        │ │
│   │   │ category         │    │ uploaded_by      │    │ syntax_tree      │                        │ │
│   │   │ current_version  │    │ created_at       │    │ analyzed_at      │                        │ │
│   │   │ is_code          │    └──────────────────┘    └──────────────────┘                        │ │
│   │   │ language         │                                                                        │ │
│   │   └──────────────────┘    File Categories:                                                    │ │
│   │                           • CODE (js, ts, py, go, rust, php, java, c#, c/c++, swift, kotlin,  │ │
│   │                                   ruby, bash, sql, html, css, yaml, json)                     │ │
│   │                           • DOCUMENT (pdf, doc, docx, txt, md)                                │ │
│   │                           • SPREADSHEET (xlsx, xls, csv)                                      │ │
│   │                           • IMAGE (jpg, png, gif, svg, webp)                                  │ │
│   │                           • DATA (sql, xml, json)                                             │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   EVENT STORE (Event Sourcing)                                                                  │ │
│   │   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                        │ │
│   │   │    EventStream   │───>│   DomainEvent    │    │    Snapshot      │                        │ │
│   │   │──────────────────│    │──────────────────│    │──────────────────│                        │ │
│   │   │ stream_id        │    │ id               │    │ id               │                        │ │
│   │   │ aggregate_type   │    │ stream_id        │    │ stream_id        │                        │ │
│   │   │ aggregate_id     │    │ version          │    │ version          │                        │ │
│   │   │ current_version  │    │ event_type       │    │ state            │                        │ │
│   │   │ created_at       │    │ data (JSON)      │    │ created_at       │                        │ │
│   │   └──────────────────┘    │ metadata (JSON)  │    └──────────────────┘                        │ │
│   │                           │ created_at       │                                                │ │
│   │                           │ created_by       │                                                │ │
│   │                           └──────────────────┘                                                │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                                                                                                 │ │
│   │   AUDIT LOG                                                                                     │ │
│   │   ┌──────────────────┐                                                                         │ │
│   │   │    AuditEntry    │    Immutable audit trail for compliance                                │ │
│   │   │──────────────────│                                                                         │ │
│   │   │ id               │                                                                         │ │
│   │   │ organization_id  │                                                                         │ │
│   │   │ user_id          │                                                                         │ │
│   │   │ action           │                                                                         │ │
│   │   │ entity_type      │                                                                         │ │
│   │   │ entity_id        │                                                                         │ │
│   │   │ old_values       │                                                                         │ │
│   │   │ new_values       │                                                                         │ │
│   │   │ ip_address       │                                                                         │ │
│   │   │ user_agent       │                                                                         │ │
│   │   │ created_at       │                                                                         │ │
│   │   └──────────────────┘                                                                         │ │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. SQL Schema (PostgreSQL)

### 3.1 Core Tables

```sql
-- migrations/postgres/000001_init_schema.up.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- IDENTITY CONTEXT
-- ============================================================================

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    plan_type       VARCHAR(50) NOT NULL DEFAULT 'FREE',
    settings        JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    permissions     TEXT[] NOT NULL DEFAULT '{}',
    is_system       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    avatar_url      VARCHAR(500),
    profile         JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- CRM CONTEXT
-- ============================================================================

CREATE TYPE customer_type AS ENUM ('COMPANY', 'INDIVIDUAL');

CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type            customer_type NOT NULL DEFAULT 'COMPANY',
    name            VARCHAR(500) NOT NULL,
    legal_name      VARCHAR(500),
    tax_id          VARCHAR(50),
    industry        VARCHAR(100),
    website         VARCHAR(500),
    addresses       JSONB NOT NULL DEFAULT '[]',
    tags            TEXT[] NOT NULL DEFAULT '{}',
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    assigned_to     UUID REFERENCES users(id),
    source          VARCHAR(100),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_name ON customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_tags ON customers USING gin(tags);

CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    position        VARCHAR(200),
    department      VARCHAR(200),
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_customer ON contacts(customer_id);

CREATE TABLE pipelines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pipeline_stages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id     UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(7),
    sort_order      INT NOT NULL,
    win_probability INT NOT NULL DEFAULT 0 CHECK (win_probability BETWEEN 0 AND 100),
    is_closed       BOOLEAN NOT NULL DEFAULT false,
    is_won          BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pipeline_stages ON pipeline_stages(pipeline_id, sort_order);

CREATE TYPE deal_status AS ENUM ('OPEN', 'WON', 'LOST');

CREATE TABLE deals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    contact_id      UUID REFERENCES contacts(id),
    pipeline_id     UUID NOT NULL REFERENCES pipelines(id),
    stage_id        UUID NOT NULL REFERENCES pipeline_stages(id),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    amount          DECIMAL(15, 2),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    probability     INT CHECK (probability BETWEEN 0 AND 100),
    expected_close  DATE,
    actual_close    DATE,
    status          deal_status NOT NULL DEFAULT 'OPEN',
    lost_reason     TEXT,
    assigned_to     UUID REFERENCES users(id),
    tags            TEXT[] NOT NULL DEFAULT '{}',
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deals_org ON deals(organization_id);
CREATE INDEX idx_deals_customer ON deals(customer_id);
CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_assigned ON deals(assigned_to);

CREATE TYPE activity_type AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK');

CREATE TABLE activities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type            activity_type NOT NULL,
    entity_type     VARCHAR(50) NOT NULL, -- customer, deal, contact
    entity_id       UUID NOT NULL,
    title           VARCHAR(500),
    description     TEXT,
    scheduled_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_mins   INT,
    outcome         VARCHAR(100),
    created_by      UUID NOT NULL REFERENCES users(id),
    assigned_to     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_scheduled ON activities(scheduled_at) WHERE completed_at IS NULL;

-- ============================================================================
-- WAREHOUSE CONTEXT
-- ============================================================================

CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES categories(id),
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50),
    path            TEXT NOT NULL, -- materialized path for tree
    level           INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_path ON categories(path);

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id),
    sku             VARCHAR(100) NOT NULL,
    name            VARCHAR(500) NOT NULL,
    description     TEXT,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'pcs',
    barcode         VARCHAR(100),
    weight          DECIMAL(10, 3),
    dimensions      JSONB, -- {length, width, height, unit}
    min_stock       DECIMAL(15, 4) DEFAULT 0,
    max_stock       DECIMAL(15, 4),
    reorder_point   DECIMAL(15, 4),
    cost_method     VARCHAR(20) NOT NULL DEFAULT 'FIFO', -- FIFO, LIFO, FEFO, AVG
    is_serialized   BOOLEAN NOT NULL DEFAULT false,
    is_batch_tracked BOOLEAN NOT NULL DEFAULT false,
    shelf_life_days INT,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, sku)
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_sku ON products(organization_id, sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products USING gin(name gin_trgm_ops);

CREATE TABLE warehouses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50),
    address         JSONB,
    manager_id      UUID REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE batch_status AS ENUM ('AVAILABLE', 'RESERVED', 'QUARANTINE', 'EXPIRED', 'DEPLETED');

CREATE TABLE batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    batch_number    VARCHAR(100) NOT NULL,
    quantity        DECIMAL(15, 4) NOT NULL DEFAULT 0,
    reserved_qty    DECIMAL(15, 4) NOT NULL DEFAULT 0,
    cost_price      DECIMAL(15, 4) NOT NULL,
    production_date DATE,
    expiry_date     DATE,
    status          batch_status NOT NULL DEFAULT 'AVAILABLE',
    attributes      JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id, batch_number)
);

CREATE INDEX idx_batches_product ON batches(product_id);
CREATE INDEX idx_batches_warehouse ON batches(warehouse_id);
CREATE INDEX idx_batches_expiry ON batches(expiry_date) WHERE status = 'AVAILABLE';

CREATE TABLE stock_balances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    quantity        DECIMAL(15, 4) NOT NULL DEFAULT 0,
    reserved_qty    DECIMAL(15, 4) NOT NULL DEFAULT 0,
    avg_cost        DECIMAL(15, 4) NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

CREATE INDEX idx_stock_product ON stock_balances(product_id);
CREATE INDEX idx_stock_warehouse ON stock_balances(warehouse_id);

CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RESERVE', 'UNRESERVE');

CREATE TABLE stock_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    movement_type   movement_type NOT NULL,
    product_id      UUID NOT NULL REFERENCES products(id),
    from_warehouse  UUID REFERENCES warehouses(id),
    to_warehouse    UUID REFERENCES warehouses(id),
    batch_id        UUID REFERENCES batches(id),
    quantity        DECIMAL(15, 4) NOT NULL,
    cost_price      DECIMAL(15, 4),
    document_type   VARCHAR(50) NOT NULL, -- receipt, shipment, order, writeoff
    document_id     UUID NOT NULL,
    line_id         UUID,
    reason          TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_document ON stock_movements(document_type, document_id);
CREATE INDEX idx_movements_date ON stock_movements(created_at);

-- ============================================================================
-- SALES CONTEXT
-- ============================================================================

CREATE TYPE order_status AS ENUM (
    'DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED',
    'SHIPPED', 'DELIVERED', 'CANCELLED'
);

CREATE TABLE sales_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    number          VARCHAR(50) NOT NULL,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    contact_id      UUID REFERENCES contacts(id),
    deal_id         UUID REFERENCES deals(id),
    quote_id        UUID,
    status          order_status NOT NULL DEFAULT 'DRAFT',
    order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    required_date   DATE,
    shipping_address JSONB,
    billing_address JSONB,
    subtotal        DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(15, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    payment_terms   VARCHAR(100),
    notes           TEXT,
    internal_notes  TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    assigned_to     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, number)
);

CREATE INDEX idx_sales_orders_org ON sales_orders(organization_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);

CREATE TABLE sales_order_lines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    line_number     INT NOT NULL,
    product_id      UUID NOT NULL REFERENCES products(id),
    description     TEXT,
    quantity        DECIMAL(15, 4) NOT NULL,
    shipped_qty     DECIMAL(15, 4) NOT NULL DEFAULT 0,
    unit_price      DECIMAL(15, 4) NOT NULL,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_rate        DECIMAL(5, 2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(15, 2) NOT NULL DEFAULT 0,
    line_total      DECIMAL(15, 2) NOT NULL,
    warehouse_id    UUID REFERENCES warehouses(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id, line_number)
);

CREATE INDEX idx_order_lines_product ON sales_order_lines(product_id);

CREATE TYPE shipment_status AS ENUM ('DRAFT', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

CREATE TABLE shipments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    number          VARCHAR(50) NOT NULL,
    order_id        UUID NOT NULL REFERENCES sales_orders(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    status          shipment_status NOT NULL DEFAULT 'DRAFT',
    ship_date       DATE,
    delivery_date   DATE,
    carrier         VARCHAR(200),
    tracking_number VARCHAR(200),
    shipping_cost   DECIMAL(15, 2),
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, number)
);

CREATE TABLE shipment_lines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id     UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    order_line_id   UUID NOT NULL REFERENCES sales_order_lines(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    batch_id        UUID REFERENCES batches(id),
    quantity        DECIMAL(15, 4) NOT NULL,
    serial_numbers  TEXT[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PURCHASING CONTEXT
-- ============================================================================

CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(500) NOT NULL,
    legal_name      VARCHAR(500),
    tax_id          VARCHAR(50),
    contacts        JSONB NOT NULL DEFAULT '[]',
    addresses       JSONB NOT NULL DEFAULT '[]',
    payment_terms   VARCHAR(100),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    lead_time_days  INT,
    rating          DECIMAL(3, 2),
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE po_status AS ENUM (
    'DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED',
    'RECEIVED', 'CANCELLED'
);

CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    number          VARCHAR(50) NOT NULL,
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    status          po_status NOT NULL DEFAULT 'DRAFT',
    order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date   DATE,
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    subtotal        DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(15, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, number)
);

CREATE TABLE purchase_order_lines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    line_number     INT NOT NULL,
    product_id      UUID NOT NULL REFERENCES products(id),
    quantity        DECIMAL(15, 4) NOT NULL,
    received_qty    DECIMAL(15, 4) NOT NULL DEFAULT 0,
    unit_price      DECIMAL(15, 4) NOT NULL,
    tax_rate        DECIMAL(5, 2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(15, 2) NOT NULL DEFAULT 0,
    line_total      DECIMAL(15, 2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id, line_number)
);

CREATE TABLE goods_receipts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    number          VARCHAR(50) NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, number)
);

CREATE TABLE goods_receipt_lines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id      UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    po_line_id      UUID REFERENCES purchase_order_lines(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    quantity        DECIMAL(15, 4) NOT NULL,
    unit_price      DECIMAL(15, 4) NOT NULL,
    batch_number    VARCHAR(100),
    production_date DATE,
    expiry_date     DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FINANCE CONTEXT
-- ============================================================================

CREATE TYPE account_type AS ENUM ('BANK', 'CASH', 'VIRTUAL', 'CREDIT');

CREATE TABLE finance_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    type            account_type NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    balance         DECIMAL(15, 2) NOT NULL DEFAULT 0,
    bank_name       VARCHAR(200),
    account_number  VARCHAR(100),
    routing_number  VARCHAR(50),
    iban            VARCHAR(50),
    swift           VARCHAR(20),
    is_default      BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE payment_type AS ENUM ('INCOMING', 'OUTGOING');
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'FAILED');

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    number          VARCHAR(50) NOT NULL,
    account_id      UUID NOT NULL REFERENCES finance_accounts(id),
    type            payment_type NOT NULL,
    status          payment_status NOT NULL DEFAULT 'PENDING',
    amount          DECIMAL(15, 2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    counterparty_type VARCHAR(50) NOT NULL, -- customer, supplier
    counterparty_id UUID NOT NULL,
    reference_type  VARCHAR(50), -- invoice, order
    reference_id    UUID,
    payment_method  VARCHAR(100),
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    description     TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, number)
);

CREATE INDEX idx_payments_counterparty ON payments(counterparty_type, counterparty_id);
CREATE INDEX idx_payments_reference ON payments(reference_type, reference_id);

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    number          VARCHAR(50) NOT NULL,
    type            VARCHAR(20) NOT NULL, -- SALES, PURCHASE
    entity_type     VARCHAR(50) NOT NULL, -- sales_order, purchase_order
    entity_id       UUID NOT NULL,
    counterparty_type VARCHAR(50) NOT NULL,
    counterparty_id UUID NOT NULL,
    invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE NOT NULL,
    amount          DECIMAL(15, 2) NOT NULL,
    paid_amount     DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    status          VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, number)
);

-- ============================================================================
-- ACCOUNTING CONTEXT (1C-like registers)
-- ============================================================================

CREATE TABLE chart_of_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE accounting_account_type AS ENUM ('ACTIVE', 'PASSIVE', 'ACTIVE_PASSIVE');

CREATE TABLE accounting_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chart_id        UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES accounting_accounts(id),
    code            VARCHAR(20) NOT NULL,
    name            VARCHAR(500) NOT NULL,
    type            accounting_account_type NOT NULL,
    is_leaf         BOOLEAN NOT NULL DEFAULT true,
    is_currency     BOOLEAN NOT NULL DEFAULT false, -- валютный учёт
    is_quantity     BOOLEAN NOT NULL DEFAULT false, -- количественный учёт
    analytics_dims  TEXT[] NOT NULL DEFAULT '{}', -- аналитические разрезы
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(chart_id, code)
);

-- Accumulation Register (Регистр накопления - как в 1С)
CREATE TABLE accumulation_registers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    register_name   VARCHAR(100) NOT NULL, -- StockBalance, CustomerDebt, etc.
    period          TIMESTAMPTZ NOT NULL,
    document_type   VARCHAR(100) NOT NULL,
    document_id     UUID NOT NULL,
    line_number     INT,
    movement_type   VARCHAR(10) NOT NULL, -- INCOME, EXPENSE
    dimensions      JSONB NOT NULL, -- {product_id, warehouse_id, batch_id}
    resources       JSONB NOT NULL, -- {quantity: 10, amount: 1000}
    attributes      JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accum_register ON accumulation_registers(organization_id, register_name, period);
CREATE INDEX idx_accum_document ON accumulation_registers(document_type, document_id);
CREATE INDEX idx_accum_dimensions ON accumulation_registers USING gin(dimensions);

-- Information Register (Регистр сведений - как в 1С)
CREATE TABLE information_registers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    register_name   VARCHAR(100) NOT NULL, -- CurrencyRates, PriceList, etc.
    dimensions      JSONB NOT NULL, -- {currency, date} or {product_id, price_type}
    resources       JSONB NOT NULL, -- {rate: 1.05} or {price: 100}
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)
);

CREATE INDEX idx_info_register ON information_registers(organization_id, register_name);
CREATE INDEX idx_info_dimensions ON information_registers USING gin(dimensions);

-- Accounting Register (Бухгалтерский регистр - проводки)
CREATE TABLE accounting_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period          DATE NOT NULL,
    document_type   VARCHAR(100) NOT NULL,
    document_id     UUID NOT NULL,
    line_number     INT NOT NULL,
    debit_account   VARCHAR(20) NOT NULL,
    credit_account  VARCHAR(20) NOT NULL,
    amount          DECIMAL(15, 2) NOT NULL,
    currency        CHAR(3),
    currency_amount DECIMAL(15, 2),
    quantity        DECIMAL(15, 4),
    debit_analytics JSONB NOT NULL DEFAULT '{}', -- {customer_id, contract_id}
    credit_analytics JSONB NOT NULL DEFAULT '{}',
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounting_period ON accounting_entries(organization_id, period);
CREATE INDEX idx_accounting_document ON accounting_entries(document_type, document_id);
CREATE INDEX idx_accounting_debit ON accounting_entries(debit_account);
CREATE INDEX idx_accounting_credit ON accounting_entries(credit_account);

-- Period Closing
CREATE TYPE period_status AS ENUM ('OPEN', 'CLOSING', 'CLOSED', 'REOPENED');

CREATE TABLE accounting_periods (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year            INT NOT NULL,
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    status          period_status NOT NULL DEFAULT 'OPEN',
    closed_at       TIMESTAMPTZ,
    closed_by       UUID REFERENCES users(id),
    reopened_at     TIMESTAMPTZ,
    reopened_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, year, month)
);

-- ============================================================================
-- WORKFLOW CONTEXT
-- ============================================================================

CREATE TYPE task_status AS ENUM (
    'NEW', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW',
    'ACCEPTED', 'REJECTED', 'COMPLETED'
);

CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    status          task_status NOT NULL DEFAULT 'NEW',
    priority        task_priority NOT NULL DEFAULT 'MEDIUM',
    creator_id      UUID NOT NULL REFERENCES users(id),
    assignee_id     UUID REFERENCES users(id),
    reviewer_id     UUID REFERENCES users(id),
    due_date        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    parent_task_id  UUID REFERENCES tasks(id),
    entity_type     VARCHAR(50), -- deal, order, customer
    entity_id       UUID,
    submission_data JSONB, -- данные, отправленные на проверку
    rejection_reason TEXT,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_org ON tasks(organization_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_reviewer ON tasks(reviewer_id);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE status NOT IN ('COMPLETED', 'REJECTED');

CREATE TABLE task_transitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_status     task_status,
    to_status       task_status NOT NULL,
    triggered_by    UUID NOT NULL REFERENCES users(id),
    reason          TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transitions_task ON task_transitions(task_id);

CREATE TABLE review_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    priority        INT NOT NULL DEFAULT 0,
    assigned_to     UUID REFERENCES users(id), -- admin or assistant
    claimed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id)
);

CREATE INDEX idx_review_queue ON review_queue(organization_id, priority DESC, created_at);

CREATE TABLE approvals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    approver_id     UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    decision        VARCHAR(20), -- ACCEPT, REJECT
    reason          TEXT,
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FILES CONTEXT
-- ============================================================================

CREATE TYPE file_category AS ENUM (
    'CODE', 'DOCUMENT', 'SPREADSHEET', 'IMAGE', 'DATA', 'OTHER'
);

CREATE TABLE files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type     VARCHAR(50) NOT NULL, -- task, deal, order
    entity_id       UUID NOT NULL,
    filename        VARCHAR(500) NOT NULL,
    original_name   VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(200) NOT NULL,
    category        file_category NOT NULL,
    size_bytes      BIGINT NOT NULL,
    is_code         BOOLEAN NOT NULL DEFAULT false,
    detected_language VARCHAR(50),
    current_version INT NOT NULL DEFAULT 1,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX idx_files_category ON files(category);

CREATE TABLE file_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id         UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    storage_path    VARCHAR(1000) NOT NULL, -- MinIO path
    size_bytes      BIGINT NOT NULL,
    checksum        VARCHAR(64) NOT NULL, -- SHA-256
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);

CREATE TABLE code_analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_version_id UUID NOT NULL REFERENCES file_versions(id) ON DELETE CASCADE,
    language        VARCHAR(50) NOT NULL,
    is_code         BOOLEAN NOT NULL,
    confidence      DECIMAL(3, 2) NOT NULL,
    content_type    VARCHAR(50) NOT NULL, -- code, sql, config, markdown, plain_text
    tokens          JSONB, -- tokenized content for AI
    metrics         JSONB, -- lines, functions, complexity
    analyzed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EVENT STORE
-- ============================================================================

CREATE TABLE event_streams (
    stream_id       VARCHAR(500) PRIMARY KEY, -- aggregate_type:aggregate_id
    aggregate_type  VARCHAR(100) NOT NULL,
    aggregate_id    UUID NOT NULL,
    current_version BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE domain_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id       VARCHAR(500) NOT NULL REFERENCES event_streams(stream_id),
    version         BIGINT NOT NULL,
    event_type      VARCHAR(200) NOT NULL,
    data            JSONB NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID,
    UNIQUE(stream_id, version)
);

CREATE INDEX idx_events_stream ON domain_events(stream_id, version);
CREATE INDEX idx_events_type ON domain_events(event_type);
CREATE INDEX idx_events_date ON domain_events(created_at);

CREATE TABLE event_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id       VARCHAR(500) NOT NULL REFERENCES event_streams(stream_id),
    version         BIGINT NOT NULL,
    state           JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id         UUID,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    request_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioned by month for performance
CREATE INDEX idx_audit_org_date ON audit_log(organization_id, created_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);

-- ============================================================================
-- INDEXES & TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at()
        ', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Index Strategy

| Table | Index Type | Columns | Purpose |
|-------|-----------|---------|---------|
| users | B-tree | (organization_id, email) | Auth lookup |
| customers | GIN | name | Full-text search |
| products | GIN | name | Full-text search |
| products | B-tree | (organization_id, sku) | SKU lookup |
| stock_balances | Composite | (product_id, warehouse_id) | Stock queries |
| batches | B-tree | expiry_date | FEFO picking |
| accumulation_registers | GIN | dimensions | Register queries |
| domain_events | B-tree | (stream_id, version) | Event replay |

---

## 5. Partitioning Strategy

```sql
-- Partition audit_log by month
CREATE TABLE audit_log (
    ...
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Auto-create partitions
CREATE OR REPLACE FUNCTION create_audit_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
BEGIN
    partition_date := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
    partition_name := 'audit_log_' || TO_CHAR(partition_date, 'YYYY_MM');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        partition_date,
        partition_date + INTERVAL '1 month'
    );
END;
$$ LANGUAGE plpgsql;
```

---

**Document Version:** 2.0
**Next:** Module Design (CRM, Sales, Warehouse, etc.)
