# CloudNotes - AWS Note Taker Application

This is a production-grade, highly decoupled Note Taker application designed as a deployment target for high-availability AWS Cloud architectures (VPC, Application Load Balancer, EC2 Auto Scaling Groups, RDS PostgreSQL, and S3 + CloudFront CDN) and GitHub Actions CI/CD pipelines.

The codebase is split into independent micro-services inside the `src/` directory to facilitate modern DevOps deployment workflows.

---

## 🏗️ Architecture Design

```
                     ┌───────────────────┐
                     │   Route 53 DNS    │
                     └─────────┬─────────┘
                               │
                      ┌────────┴────────┐
                      │ CloudFront CDN  │
                      └────────┬────────┘
                               │ (Static Assets)
                     ┌─────────▼─────────┐
                     │  S3 Static Bucket │
                     │ (React Frontend)  │
                     └───────────────────┘
                               
                               │ (API Requests: /api/*, /health)
                     ┌─────────▼─────────┐
                     │    AWS ALB        │
                     └─────────┬─────────┘
                               │ (Reverse Proxy)
                     ┌─────────▼─────────┐
                     │  EC2 AutoScaling  │
                     │  (Express API)    │
                     └─────────┬─────────┘
                               │ (Database Queries)
                     ┌─────────▼─────────┐
                     │ AWS RDS Postgres  │
                     └───────────────────┘
```

- **Frontend (`src/frontend`)**: A modern React SPA compiled with Vite. In production, this compiles to pure static HTML/CSS/JS (`dist/`) which should be synced directly to an **AWS S3 bucket** and distributed worldwide via **CloudFront CDN** for optimal load times and cost-efficiency.
- **Backend (`src/backend`)**: A Node.js Express server. In production, this should run on **EC2 instances inside an Auto Scaling Group** (packaged via Docker or Zip deployment) behind an **Application Load Balancer**.
- **Database (RDS)**: The backend automatically connects to **PostgreSQL** when RDS credentials are provided. If none are configured, it automatically falls back to a **local SQLite file** (`notes.db`), making it extremely simple to run locally without external dependencies.

---

## 🚀 Local Development Setup

To run both the Frontend and Backend concurrently with hot-reloading:

### Prerequisites
- Node.js (v18+ recommended)
- NPM

### Step 1: Install Dependencies
From this `app/` root directory, install dependencies for both services:
```bash
npm run install:all
```

### Step 2: Configure Environment (Optional)
The backend works out-of-the-box using SQLite. If you want to connect to a local or AWS RDS PostgreSQL database, copy the template in the backend folder:
```bash
cp src/backend/.env.example src/backend/.env
```
And uncomment/fill in your PostgreSQL credentials:
```ini
PGHOST=your-rds-endpoint.us-east-1.rds.amazonaws.com
PGUSER=postgres
PGPASSWORD=your-rds-master-password
PGDATABASE=notetaker
PGPORT=5432
PGSSL=true # Enable SSL/TLS for AWS RDS security
```

### Step 3: Run the Development Servers
Launch both dev environments simultaneously:
```bash
npm run dev
```
- **Frontend** will start at: [http://localhost:5173](http://localhost:5173)
- **Backend API** will start at: [http://localhost:5000](http://localhost:5000)
- *Note:* The Vite dev server is pre-configured with a reverse-proxy so that frontend requests to `/api` or `/health` are routed to the backend automatically, avoiding CORS issues during development.

---

## 🛠️ DevOps & Deployment Integration

### 1. CI/CD GitHub Actions Workflow (Suggested)

Your `.github/workflows/` can be written to run two distinct paths:

#### Path A: Frontend Deploy to S3 + CloudFront
- **Trigger**: Changes in `app/src/frontend/**`
- **Steps**:
  1. Set up Node.js
  2. Install and Build:
     ```bash
     cd app/src/frontend
     npm ci
     npm run build
     ```
  3. Deploy static assets in `dist/` to your AWS S3 bucket:
     ```bash
     aws s3 sync dist/ s3://your-s3-bucket-name --delete
     ```
  4. Create CloudFront invalidation to clear cache:
     ```bash
     aws aws cloudfront create-invalidation --distribution-id YOUR_CF_DIST_ID --paths "/*"
     ```

#### Path B: Backend Deploy to EC2 / ASG
- **Trigger**: Changes in `app/src/backend/**` or `app/Dockerfile`
- **Steps (Docker / ECS Model)**:
  1. Build Docker container using the production Dockerfile at `app/Dockerfile`
  2. Push to **AWS ECR**
  3. Deploy new task definition to **ECS / Fargate**
- **Steps (EC2 / ASG Zip Model)**:
  1. Compress the `app/src/backend` folder along with a CodeDeploy `appspec.yml`
  2. Upload zip to S3
  3. Trigger **AWS CodeDeploy** to perform a rolling update across your Auto Scaling Group.

---

## 🔒 High-Availability & Production Best Practices

- **Active-Active Health Checking**: The backend exposes `GET /health`. This endpoint performs a live query (`SELECT 1`) to check the active database connection. Configure your **AWS ALB Target Group Health Check** to query `/health` on port `5000`. If RDS drops, the ALB will immediately mark the node as unhealthy and stop routing traffic.
- **Graceful Termination**: The server hooks into `SIGTERM` and `SIGINT` signals (standard for AWS ECS and Autoscaling scale-in events). It will drain ongoing HTTP connections and close the RDS pool cleanly before exiting, ensuring zero-downtime rolling deploys.
- **CloudWatch Structured Logging**: The logging system outputs logs as formatted JSON. This makes it trivial to write **CloudWatch Metric Filters** to alert on server errors, monitor response rates, or construct CloudWatch Contributor Insights dashboards.
- **Docker Security Compliance**: The container runs under a secure, non-root user (`node`). It avoids executing commands as root inside your VPC.
