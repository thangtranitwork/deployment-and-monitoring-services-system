# ==========================================
# STAGE 1: Build React SPA Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Build Go Backend (ids-commander)
# ==========================================
FROM golang:1.24-bullseye AS backend-builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ ./cmd/
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o ids-commander ./cmd/ids-commander

# ==========================================
# STAGE 3: Final Lightweight Runtime Image
# ==========================================
FROM debian:bookworm-slim

# Install runtime utilities needed by IDS
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    git \
    curl \
    sudo \
    psmisc \
    openssh-client \
    openvpn \
    ca-certificates \
    tzdata \
    procps \
    iproute2 \
    net-tools \
    && rm -rf /var/lib/apt/lists/* \
    && git config --global --add safe.directory "*"

WORKDIR /app

# Copy compiled backend binary and frontend build artifacts
COPY --from=backend-builder /app/ids-commander /app/ids-commander
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY templates/ /app/templates/
COPY static/ /app/static/

# Environment defaults
ENV APP_MODE=BOTH
ENV PORT=5555
ENV REACT_PORT=55555

# Expose Web Ports (HTML mode & React SPA mode)
EXPOSE 5555 55555

ENTRYPOINT ["/app/ids-commander"]
