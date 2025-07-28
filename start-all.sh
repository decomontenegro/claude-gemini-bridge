#!/bin/bash

# Script para iniciar todos os serviços do Claude-Gemini Bridge
# Este script inicia o backend e o frontend de forma coordenada

echo "🚀 Iniciando Claude-Gemini Bridge..."

# Verifica se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do backend..."
    npm install
fi

if [ ! -d "web/node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    cd web && npm install && cd ..
fi

# Verifica se o código está compilado
if [ ! -d "dist" ]; then
    echo "🔨 Compilando código TypeScript..."
    npm run build
fi

# Limpa arquivos de log antigos
echo "🧹 Limpando logs antigos..."
rm -f bridge-server.log
rm -f /tmp/server.log
rm -f /tmp/nextjs.log

# Mata processos anteriores se existirem
echo "🔄 Parando processos anteriores..."
pkill -f "node dist/server/bridge-server.js" 2>/dev/null
pkill -f "next dev" 2>/dev/null

# Aguarda processos serem finalizados
sleep 2

# Inicia o servidor backend
echo "🖥️  Iniciando servidor backend na porta 3001..."
npm run server > /tmp/server.log 2>&1 &
BACKEND_PID=$!

# Aguarda o backend iniciar
echo "⏳ Aguardando backend iniciar..."
for i in {1..10}; do
    if curl -s http://localhost:3001/api/v1/health > /dev/null; then
        echo "✅ Backend iniciado com sucesso!"
        break
    fi
    sleep 1
done

# Inicia o frontend
echo "🎨 Iniciando frontend na porta 3000..."
cd web
npm run dev > /tmp/nextjs.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Aguarda o frontend iniciar
echo "⏳ Aguardando frontend iniciar..."
for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Frontend iniciado com sucesso!"
        break
    fi
    sleep 1
done

echo ""
echo "✨ Claude-Gemini Bridge está rodando!"
echo ""
echo "📍 URLs disponíveis:"
echo "   - Frontend (Dashboard): http://localhost:3000"
echo "   - Backend API: http://localhost:3001/api/v1"
echo "   - WebSocket: ws://localhost:3001"
echo ""
echo "📄 Logs:"
echo "   - Backend: tail -f /tmp/server.log"
echo "   - Frontend: tail -f /tmp/nextjs.log"
echo ""
echo "🛑 Para parar todos os serviços, use: ./stop-all.sh"
echo ""
echo "Pressione Ctrl+C para parar todos os serviços..."

# Função para limpar ao sair
cleanup() {
    echo ""
    echo "🛑 Parando todos os serviços..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    pkill -f "node dist/server/bridge-server.js" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    echo "✅ Todos os serviços foram parados."
    exit 0
}

# Captura sinais de interrupção
trap cleanup INT TERM

# Mantém o script rodando
wait
