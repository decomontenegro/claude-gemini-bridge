#!/bin/bash

# Script para parar todos os serviços do Claude-Gemini Bridge

echo "🛑 Parando todos os serviços do Claude-Gemini Bridge..."

# Para o servidor backend
echo "📍 Parando servidor backend..."
pkill -f "node dist/server/bridge-server.js" 2>/dev/null

# Para o frontend Next.js
echo "📍 Parando frontend..."
pkill -f "next dev" 2>/dev/null

# Para qualquer processo npm relacionado
pkill -f "npm run server" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

# Aguarda um momento
sleep 1

# Verifica se ainda há processos rodando
BACKEND_CHECK=$(ps aux | grep "node dist/server/bridge-server.js" | grep -v grep)
FRONTEND_CHECK=$(ps aux | grep "next dev" | grep -v grep)

if [ -z "$BACKEND_CHECK" ] && [ -z "$FRONTEND_CHECK" ]; then
    echo "✅ Todos os serviços foram parados com sucesso!"
else
    echo "⚠️  Alguns processos ainda estão rodando:"
    if [ ! -z "$BACKEND_CHECK" ]; then
        echo "   - Backend ainda está rodando"
    fi
    if [ ! -z "$FRONTEND_CHECK" ]; then
        echo "   - Frontend ainda está rodando"
    fi
    echo ""
    echo "Use 'ps aux | grep node' para verificar processos restantes"
fi