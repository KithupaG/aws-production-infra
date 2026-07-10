# CloudNotes - Production Grade AWS Infrastructure

A full-stack Note Taker application designed as a sandbox for building production-grade AWS infrastructure with Terraform. The app is fully containerized with Docker and orchestrated with Docker Compose, ready to be deployed across a high-availability AWS architecture.

## Architecture

```
                        ┌──────────────────────────────────┐
                        │         AWS Cloud (Target)       │
                        │                                  │
                        │   Route53 ─── CloudFront ─── S3  │
                        │                    │             │
                        │                    ▼             │
                        │        ┌─────── ALB ───────┐     │
                        │        │                   │     │
                        │   ┌────▼────┐        ┌────▼────┐ │
                        │   │ EC2 ASG │        │ EC2 ASG │ │
                        │   │(Backend)│        │(Backend)│ │
                        │   └────┬────┘        └────┬────┘ │
                        │        │                  │      │
                        │        └────────┬─────────┘      │
                        │                 ▼                │
                        │           ┌──── RDS ────┐        │
                        │           │  PostgreSQL │        │
                        │           └─────────────┘        │
                        └──────────────────────────────────┘

Local (Docker Compose):
┌──────────┐    ┌────────────┐    ┌──────────────┐
│ Frontend │───▶│  Backend  │───▶│  PostgreSQL  │
│ (Nginx)  │    │ (Node.js)  │    │ (15-alpine)  │
│  :3000   │    │  :5001     │    │   :5432      │
└──────────┘    └────────────┘    └──────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL 15 (SQLite fallback) |
| Containerization | Docker, Docker Compose |
| Web Server | Nginx (reverse proxy + static serving) |
| Infrastructure as Code | Terraform |
| Cloud Provider | AWS |

## Project Structure

```
aws-production-infra/
├── app/                          # Application source code
│   ├── docker-compose.yaml       # Multi-service orchestration
│   └── src/
│       ├── frontend/             # React + Vite app
│       │   ├── Dockerfile        # Multi-stage build (Node → Nginx)
│       │   ├── nginx.conf        # Reverse proxy config
│       │   └── src/
│       └── backend/              # Express API
│           ├── Dockerfile        # Node.js production image
│           ├── server.js         # API routes + health checks
│           └── db.js             # Dual-engine DB (Postgres/SQLite)
├── environments/                 # Terraform environments
│   ├── dev/
│   └── prod/
├── modules/                      # Terraform modules
│   ├── vpc/                      # VPC, subnets, NAT gateway
│   ├── alb/                      # Application Load Balancer
│   ├── ec2-asg/                  # EC2 Auto Scaling Group
│   ├── rds/                      # Managed PostgreSQL
│   ├── s3-cdn/                   # S3 static hosting + CloudFront
│   ├── iam/                      # IAM roles and policies
│   ├── security/                 # Security groups, WAF
│   └── monitoring/               # CloudWatch alarms, dashboards
├── scripts/                      # Deployment and utility scripts
├── docs/                         # Documentation
└── blog/                         # Dev.to blog series
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) v22+ (for local development only)
- [Terraform](https://www.terraform.io/) (for AWS deployment)

### Running Locally with Docker

1. Clone the repository:

```bash
git clone https://github.com/your-username/aws-production-infra.git
cd aws-production-infra/app
```

2. Create your `.env` file:

```bash
cp src/backend/.env.example src/backend/.env
```

3. Start all services:

```bash
docker compose up -d
```

4. Verify everything is running:

```bash
docker compose ps
```

5. Open the app in your browser:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5001
- **Health Check:** http://localhost:5001/health

### Running Locally without Docker

1. Install dependencies:

```bash
npm run install:all
```

2. Start both frontend and backend in development mode:

```bash
npm run dev
```

- Frontend runs on http://localhost:5173 (Vite dev server with API proxy)
- Backend runs on http://localhost:5000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (DB status, uptime, memory) |
| GET | `/api/notes` | Get all notes |
| GET | `/api/notes/:id` | Get a specific note |
| POST | `/api/notes` | Create a new note |
| PUT | `/api/notes/:id` | Update an existing note |
| DELETE | `/api/notes/:id` | Delete a note |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `PGHOST` | PostgreSQL host | - |
| `PGUSER` | PostgreSQL user | - |
| `PGPASSWORD` | PostgreSQL password | - |
| `PGDATABASE` | PostgreSQL database | - |
| `PGPORT` | PostgreSQL port | `5432` |
| `PGSSL` | Enable SSL (`true`/`false`) | `false` |
| `SQLITE_DB_PATH` | SQLite fallback path | `notes.db` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `*` |

## AWS Infrastructure (Upcoming)

This project will be deployed to AWS using the following architecture:

- **VPC** — Multi-AZ with public/private subnets across 3 availability zones
- **ALB** — Application Load Balancer with health checks and SSL termination
- **EC2 Auto Scaling** — Backend compute with auto-scaling policies
- **RDS** — Managed PostgreSQL with multi-AZ failover
- **S3 + CloudFront** — Static frontend hosting with CDN
- **CloudWatch** — Monitoring, alarms, and dashboards

See the [Terraform modules](modules/) for the infrastructure definitions.

## Blog Series

This project is documented as a Dev.to blog series:

1. [Part 1: Building a Production Grade AWS Infrastructure Project](https://dev.to/trenation/building-a-production-grade-aws-infrastructure-project-part-1-5ceb)
2. [Part 2: Building a Production Grade AWS Infrastructure Project: Containerization](https://dev.to/trenation/building-a-production-grade-aws-infrastructure-project-part-2-containerization-pkg)

## License

ISC
