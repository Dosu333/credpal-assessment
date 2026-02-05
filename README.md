# FX Trading App (NestJS)

A high-integrity financial backend built with **NestJS**, **PostgreSQL**, and **Redis**. This system implements double-entry accounting, optimistic/pessimistic locking, and real-time FX trading with robust security practices.

## 🏗 Architectural Decisions & Senior Patterns

This project moves beyond standard CRUD to address concurrency, auditability, and security in financial applications.

### 1. Financial Integrity (Double-Entry Ledger)

* **Decision:** We do not simply update a `balance` column. Every financial movement involves a **Ledger Entry** (Debit/Credit).
* **Why:** Ensures auditability. Money is never created or destroyed; it moves from `External_Provider`  `User` or `User`  `System_Liquidity`.
* **Atomicity:** All ledger entries and balance updates occur within a single ACID transaction.

### 2. Concurrency Control (Pessimistic Locking)

* **Decision:** Utilizes `lock: { mode: 'pessimistic_write' }` on Wallet Balance rows during transactions.
* **Why:** Prevents "Double-Spend" attacks and race conditions where two concurrent requests could spend the same funds.

### 3. Security (Token Rotation)

* **Decision:** Implements **Short-lived Access Tokens (15m)** and **Long-lived Refresh Tokens (7d)** with rotation logic.
* **Why:** Allows for immediate revocation of access in compromised scenarios without forcing frequent user logins. Revoked refresh tokens are tracked in the database.

### 4. Performance (Tiered FX Caching)

* **Decision:** Uses a **Stale-While-Revalidate** strategy with Redis.
* **Why:** Eliminates latency spikes. If data is slightly stale (30s-60s), the system serves the cached rate immediately while triggering a background refresh, ensuring 0ms latency for the user while maintaining data freshness.

### 5. Domain-Driven Design (Modular Architecture)

* **Decision:** The `Currency` logic is isolated in the `SystemModule` and exported.
* **Why:** Prevents circular dependencies and ensures strict boundary enforcement. The `WalletService` consumes a clean API rather than accessing raw repositories of other domains.

---

## 🚀 Setup Instructions

### Prerequisites

* Docker & Docker Compose
* Node.js (v18+) (Optional, for local dev)

### 1. Environment Configuration

Create a `.env` file in the root directory:

```bash
# App
NODE_ENV=development
PORT=3000

# Security
JWT_SECRET=super_secure_secret_key_change_me
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d

# Database (Postgres)
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=user
DB_PASSWORD=password
DB_NAME=fintech_wallet

# Cache (Redis)
REDIS_HOST=redis
REDIS_PORT=6379

# External APIs
FX_API_KEY=your_exchangerate_api_key

```

### 2. Run with Docker

The entire stack (App, DB, Redis) is containerized.

```bash
# Start the services
docker compose up --build

# Run in detached mode
docker compose up -d

```

### 3. Database Seeding (Critical)

For the ledger to work, the system requires "System Wallets" (The House) and default Currencies.

```bash
# Run the seed script inside the container
docker compose exec app npm run seed:system
docker compose exec app npm run seed:currencies

```

---

## 🔑 Key Assumptions

1. **System Liquidity:**
* The system operates on an "Infinite Liquidity" assumption for the MVP. While we track `System Wallet` balances via the ledger, strict checks blocking trades due to low system liquidity are currently disabled to facilitate testing.


2. **External Providers:**
* Funding is simulated via an `EXTERNAL_PROVIDER_ID` wallet. In a production environment, this would integrate with webhooks from Stripe/Paystack.


3. **Idempotency:**
* All financial endpoints require a unique `reference` key (or generate one) to prevent duplicate processing of the same transaction.



---

## 📚 API Documentation

Once the application is running, full **OpenAPI / Swagger** documentation is available at:

> **http://localhost:3000/docs**

### Core Endpoints

| Module | Method | Endpoint | Description |
| --- | --- | --- | --- |
| **Auth** | `POST` | `/auth/login` | Returns Access & Refresh Tokens |
| **Auth** | `POST` | `/auth/refresh` | Rotates Refresh Token to get new Access Token |
| **Wallet** | `POST` | `/wallet/fund` | Deposits funds (External  User) |
| **Wallet** | `POST` | `/wallet/trade` | Swaps currencies (Atomic Double-Entry) |
| **Wallet** | `GET` | `/wallet/transactions` | Paginated transaction history with filters |
| **FX** | `GET` | `/fx/rates` | Live exchange rates for supported currencies |
| **Admin** | `POST` | `/admin/system/currency` | Add/Disable supported currencies |

---

## 🧪 Running Tests

The project includes comprehensive integration tests for the financial core.

```bash
# Run Unit & Integration Tests
docker compose exec app npm run test

# Run specific Wallet Service tests
docker compose exec app npm run test -- wallet.service

```