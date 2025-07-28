# Troubleshooting Guide 🛠️

## Problemas Comuns e Soluções

### 1. Erro de Conexão Redis (ECONNREFUSED 127.0.0.1:6379)

**Problema**: O servidor tenta conectar ao Redis mas falha com erro de conexão recusada.

**Solução**:
1. Verifique o arquivo `.env` e certifique-se que `DISTRIBUTED_MODE=false`
2. Se quiser usar modo distribuído, inicie o Redis:
   ```bash
   ./start-distributed.sh
   ```

### 2. Dashboards não estão funcionando

**Problema**: "os dashboards nao estao funcionando"

**Solução**:
1. Certifique-se que AMBOS os serviços estão rodando:
   - Backend na porta 3001: `npm run server`
   - Frontend na porta 3000: `cd web && npm run dev`
2. Use o script de inicialização completo:
   ```bash
   ./start-all.sh
   ```
3. Acesse o dashboard em: http://localhost:3000 (NÃO 3001!)

### 3. Workflows não têm campo para entrada de tarefa

**Problema**: "nao tem o local para colocar a task"

**Solução**:
- Este problema foi corrigido. O campo de entrada agora aparece quando você seleciona um workflow
- Se ainda não aparecer, limpe o cache do navegador (Ctrl+Shift+R)

### 4. Confusão com Portas

**Portas Corretas**:
- **3000**: Frontend/Dashboard (Next.js)
- **3001**: Backend API Server
- **5173**: NÃO é usado neste projeto (seria Vite)

### 5. API Keys não configuradas

**Problema**: Erros de autenticação com Claude ou Gemini

**Solução**:
1. Configure as API keys em AMBOS os arquivos:
   - `.env` (backend)
   - `web/.env.local` (frontend)
2. Exemplo:
   ```env
   CLAUDE_API_KEY=sk-ant-api03-...
   GEMINI_API_KEY=AIzaSy...
   ```

### 6. Erro "Task execution failed"

**Possíveis causas**:
1. Backend não está rodando
2. API keys inválidas
3. Tipo de tarefa não suportado

**Debug**:
1. Verifique os logs do backend:
   ```bash
   tail -f /tmp/server.log
   ```
2. Procure por mensagens de erro específicas
3. Verifique se o tipo de tarefa é válido: `code`, `search`, `multimodal`, `analysis`, `validation`, `ultrathink`

### 7. WebSocket não conecta

**Problema**: Real-time updates não funcionam

**Solução**:
1. Verifique se o backend está rodando
2. Verifique CORS no arquivo `.env`:
   ```env
   CORS_ORIGIN=http://localhost:3000
   ```
3. No browser, verifique o console para erros de WebSocket

### 8. Build falha com erros TypeScript

**Solução**:
```bash
# Limpe o cache e rebuilde
rm -rf dist
npm run build
```

### 9. "Unexpected end of JSON input"

**Problema**: Arquivo de learning data corrompido

**Solução**:
```bash
rm -f learning-*.json
# O sistema criará novos arquivos automaticamente
```

## Comandos Úteis para Debug

### Verificar Processos
```bash
# Ver todos os processos Node
ps aux | grep node

# Ver portas em uso
lsof -i :3000
lsof -i :3001
```

### Logs em Tempo Real
```bash
# Backend logs
tail -f /tmp/server.log

# Frontend logs
tail -f /tmp/nextjs.log

# Backend log principal
tail -f bridge-server.log
```

### Testar Endpoints
```bash
# Health check
curl http://localhost:3001/api/v1/health

# Executar tarefa
curl -X POST http://localhost:3001/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"task":{"type":"ultrathink","payload":{"description":"teste"}}}'
```

### Reiniciar Tudo
```bash
# Parar todos os serviços
./stop-all.sh

# Iniciar tudo novamente
./start-all.sh
```

## Fluxo de Resolução de Problemas

1. **Primeiro**: Verifique se todos os serviços estão rodando
2. **Segundo**: Verifique os logs para mensagens de erro
3. **Terceiro**: Teste endpoints manualmente com curl
4. **Quarto**: Verifique configurações (.env)
5. **Quinto**: Reinicie todos os serviços

## Logs Importantes

Quando reportar um problema, inclua:
1. Saída de `curl http://localhost:3001/api/v1/health`
2. Últimas 20 linhas de `/tmp/server.log`
3. Erros no console do navegador
4. Versão do Node.js: `node --version`

## Suporte

Se o problema persistir:
1. Verifique o GUIA_RAPIDO.md para instruções básicas
2. Consulte o ULTRATHINK_MODE.md para funcionalidades específicas
3. Verifique os logs detalhados com os comandos acima