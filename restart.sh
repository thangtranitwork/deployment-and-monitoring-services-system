#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs) 2>/dev/null || true
fi

APP_MODE=$(echo "${APP_MODE:-BOTH}" | tr '[:lower:]' '[:upper:]')
PORT="${PORT:-5555}"
REACT_PORT="${REACT_PORT:-55555}"

echo "========================================="
echo "🚀 Restructuring & Building IDS Stack [Mode: $APP_MODE]"
echo "========================================="

# 1. Build React Frontend if mode is REACT or BOTH
if [ "$APP_MODE" = "REACT" ] || [ "$APP_MODE" = "BOTH" ]; then
    if [ -d "$PROJECT_ROOT/frontend" ] && [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
        echo "📦 [1/3] Building React Frontend (Vite + TS)..."
        cd "$PROJECT_ROOT/frontend"
        if [ ! -d "node_modules" ]; then
            echo "📥 Installing frontend dependencies..."
            npm install
        fi
        npm run build
        cd "$PROJECT_ROOT"
    else
        echo "⚠️  [1/3] Frontend directory not found!"
    fi
else
    echo "ℹ️  [1/3] Skipping React Build (APP_MODE=$APP_MODE)"
fi

# 2. Build Go Binary
echo "🔨 [2/3] Compiling Go Backend (ids-commander)..."
go build -o ids-commander ./cmd/ids-commander

# 3. Restart Process
echo "🔄 [3/3] Restarting IDS Process..."
pkill -f "ids-commander" || true
sleep 1
nohup ./ids-commander > ids-commander.log 2>&1 &
sleep 1

echo "========================================="
echo "✅ IDS Successfully Built & Running!"
if [ "$APP_MODE" = "HTML" ] || [ "$APP_MODE" = "BOTH" ]; then
    echo "👉 Access HTML Version at: http://localhost:$PORT"
fi
if [ "$APP_MODE" = "REACT" ] || [ "$APP_MODE" = "BOTH" ]; then
    echo "👉 Access React SPA at:   http://localhost:$REACT_PORT"
fi
echo "========================================="
