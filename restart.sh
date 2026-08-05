#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "========================================="
echo "🚀 Restructuring & Building IDS Stack"
echo "========================================="

# 1. Build React Frontend if frontend directory exists
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
    echo "ℹ️  [1/3] Using static/ & templates/ assets..."
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

if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs) 2>/dev/null || true
fi

PORT="${PORT:-5555}"
echo "========================================="
echo "✅ IDS Successfully Built & Running!"
echo "👉 Access Web SPA at: http://localhost:$PORT"
echo "========================================="
