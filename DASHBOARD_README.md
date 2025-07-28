# Claude-Gemini Bridge Dashboard

## Como acessar o Dashboard

O dashboard é uma aplicação web separada que precisa ser iniciada independentemente do servidor API.

### Passo 1: Iniciar o servidor API

```bash
# Modo standalone (sem Redis)
npm run server
# ou
./start-server.sh

# Modo distribuído (requer Redis)
./start-distributed.sh
```

### Passo 2: Iniciar o Dashboard Web

Em um novo terminal:

```bash
cd web
npm install  # apenas na primeira vez
npm run dev
```

### Passo 3: Acessar o Dashboard

Abra seu navegador em: **http://localhost:3000**

## URLs importantes

- **Dashboard Web**: http://localhost:3000
- **API Server**: http://localhost:3001/api/v1
- **WebSocket**: ws://localhost:3001

## Recursos do Dashboard

- Visualização em tempo real do status do sistema
- Monitoramento de tarefas
- Métricas de desempenho
- Logs em tempo real
- Configuração do sistema

## Solução de problemas

### Dashboard não carrega
1. Verifique se o servidor web está rodando (`cd web && npm run dev`)
2. Verifique se a porta 3000 está livre
3. Verifique o console do navegador para erros

### Não conecta com o servidor API
1. Verifique se o servidor API está rodando (porta 3001)
2. Verifique as configurações CORS
3. Verifique se o WebSocket está conectado

### Portas em uso
- Dashboard Web: 3000
- API Server: 3001 (standalone) ou 3001+ (distribuído)
- Redis: 6379 (apenas modo distribuído)