# FinTwin — Financial Digital Twin System

FinTwin is a modern, fully-isolated, multi-tenant financial architecture that allows users to manage their live accounts, track real-time transactions, and run "Digital Twin" simulations against their state without modifying live data.

## 🏗️ Architecture

FinTwin utilizes a robust microservices architecture containerized via **Docker** and orchestrated using **Docker Compose**. All internal traffic is routed through an **Nginx** API Gateway.

### Core Microservices (Backend)

Written in **Python (FastAPI)** and communicating with a single **PostgreSQL** database node (with separate logical models), the backend is broken out into six independent services. It also utilizes **Redis** for high-speed volatile caching:

1. **Account Service (`:8001`)**
   - Handles user registration, JWT generation, secure credential hashing, and basic balances.
   - Includes cross-service internal "status/existence" endpoints.

2. **Transaction Service (`:8002`)**
   - Logs deposits, withdrawals, and inter-user transfers.
   - Manages strict database `WHERE` filtering ensuring users can only interact with money they own.

3. **Twin Service (`:8003`)**
   - The Digital Twin engine. Allows running hypothetical scenarios (e.g. rate changes, massive withdrawals) on duplicate temporary states to assess projected risk.

4. **Risk Service (`:8004`)**
   - Analyzes real-time metrics including live balance, transaction velocity, and anomaly detection to continuously generate a "Risk Score".
   - Generates user-specific UI notifications on the primary dashboard.

5. **Portfolio Service (`:8005`)**
   - Aggregates user account and transaction data to present a holistic view of the user's wealth.
   - Implements robust pagination and optimizations for frontend display.

6. **Notification Service (`:8006`)**
   - Dedicated service for managing system and user-specific alerts.
   - Integrates across services to keep users informed natively.
### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Context-aware custom Vanilla CSS (dark/light themes).
- **HTTP Client**: Axios

## 🛡️ Security & Multi-Tenancy

FinTwin adheres to a strict Zero-Trust philosophy. Data leakage between users is mathematically prevented natively at the backend query layer.

- **JWT Authorization**: All endpoints demand a cryptographically signed JWT via the `Authorization: Bearer <token>` header.
- **Intrinsic Identity Lock**: Identity is extracted securely via `jwt.decode(token).get("sub")`. Client payloads requesting specific `account_id` operations are ignored if they do not match the JWT inherently validating the sender.
- **Server-to-Server Auth Proxy**: Microservices needing data from sister services (e.g. Risk needing Account Balances) securely proxy the original user's JWT so credentials aren't bypassed in intra-container traffic.

## 📦 Dependencies

### Backend Packages (Python 3.11+)

- `fastapi` (API Framework)
- `uvicorn` (ASGI Server)
- `sqlalchemy` (ORM)
- `psycopg2-binary` (Postgres driver)
- `passlib[bcrypt]` (Password hashing)
- `python-jose[cryptography]` (JWT Generation & Decoding)
- `httpx` (Internal Server-to-Server HTTP Client)
- `pydantic` (Data Validation)
- `redis` (In-memory caching client)

### Frontend Packages (Node.js)

- `react` / `react-dom` (^18.2.0)
- `vite` (^5.0.8)
- `axios` (^1.6.2)

### Infrastructure Layer

- `docker` & `docker-compose`
- `nginx:latest`
- `postgres:15`
- `redis:alpine`
## 🚀 Setup & Execution

### Prerequisites

- Docker Engine & Docker Compose installed natively.

### Running Locally

To completely build, compile, and execute the multi-container stack, run the following from the root directory:

```bash
docker compose up -d --build
```

### Access Points

1. **Frontend App**: [http://localhost:3000](http://localhost:3000) (if proxied via your local Dev server) or mapped automatically by Nginx via `http://localhost:80`.
2. **PostgreSQL DB**: Mapped to `localhost:5432`.
   - User: `postgres`
   - Password: `postgres`
   - DB Name: `fintwin`

## 📝 Key Endpoints Profile (Post-Security Upgrade)

### Auth (`auth.py`)

- `POST /auth/register` (Public)
- `POST /auth/login` (Public, returns `ft_token`)

### Account Operations

- `GET /accounts/` (Strict: filters `id == current_user.id`)
- `GET /accounts/{id}` (Strict: 403 if `id != current_user.id`)

### Transactions

- `GET /transactions/` (Aggregates where `account_id` OR `to_account` align with user)
- `POST /transactions/` (Forces sender to match logged-in user, triggers Transfer validations safely)

### Risk & Status

- `GET /risk/notifications/{id}` (Generates smart alerts evaluating cross-service user data)
- `POST /simulate` (Safely spins up Twin metrics analyzing virtual balance projections)

### Portfolio & Notification

- `GET /portfolio/` (Aggregates accounts and balances securely to summarize wealth)
- `GET /notifications/` (Retrieves user-specific system alerts contextually)
