# =============================================================================
# Production Dockerfile for the CloudNotes Backend Service
# =============================================================================

# Stage 1: Build & Prune Dependencies
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package details
COPY src/backend/package*.json ./

# Install all dependencies (including devDependencies for testing/building if needed)
RUN npm ci

# Copy source code
COPY src/backend/ ./

# Stage 2: Production Release
FROM node:18-alpine AS runner

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /usr/src/app

# Copy package files
COPY src/backend/package*.json ./

# Install production dependencies only and clean cache
RUN npm ci --only=production && npm cache clean --force

# Copy application source code from the builder stage
COPY --from=builder /usr/src/app/ .

# Ensure the app runs as a secure non-root user for AWS security compliance
USER node

# Expose port
EXPOSE 5000

# Docker Healthcheck targeting the ALB-compatible route
# Allows ECS / AWS to monitor container status directly
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Launch command
CMD ["node", "server.js"]