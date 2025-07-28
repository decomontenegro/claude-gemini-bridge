# Teste do Dashboard - Passo a Passo

## 1. Verificar se tudo está rodando

### Terminal 1 - Backend
```bash
npm run server
```
Deve mostrar:
- `Bridge Server started on port 3001`
- `Mode: Standalone`

### Terminal 2 - Frontend
```bash
cd web
npm run dev
```
Deve mostrar:
- `Ready in ...`
- `Local: http://localhost:3000`

## 2. Testar a API diretamente

Abra um terceiro terminal e execute:

```bash
curl -X POST http://localhost:3001/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"task": {"type": "code", "payload": {"description": "Hello world em Python"}}, "options": {"preferredCLI": "claude"}}'
```

Se funcionar, você verá um código Python.

## 3. Usar o Dashboard

1. Abra http://localhost:3000
2. Clique na aba **"Execute"** (segunda aba)
3. Preencha:
   - **Task Type**: Code
   - **Description**: Crie uma função Python para calcular fatorial
   - **Orchestrator**: Auto
   - **Execution Mode**: Single
4. Clique em **"Execute Task"**

## 4. Verificar problemas

### Se aparecer "Failed to connect to backend server"
- Verifique se o servidor está rodando (porta 3001)
- Verifique o console do navegador (F12)
- Verifique os logs do servidor

### Se a tarefa não executa
- Verifique se você tem as API Keys configuradas no arquivo `.env`:
  - CLAUDE_API_KEY
  - GEMINI_API_KEY

### Console do navegador
Pressione F12 e veja se há erros na aba Console.

## 5. Teste alternativo

Se o botão não funcionar, tente executar no console do navegador (F12):

```javascript
fetch('/api/tasks/execute-simple', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    type: 'code',
    description: 'Hello world',
    orchestrator: 'auto',
    mode: 'single'
  })
}).then(r => r.json()).then(console.log)
```

## Solução rápida

Se nada funcionar, reinicie ambos os serviços:

1. Pare tudo (Ctrl+C nos dois terminais)
2. Execute novamente:
   ```bash
   # Terminal 1
   npm run server
   
   # Terminal 2
   cd web
   npm run dev
   ```
3. Aguarde 5 segundos e tente novamente