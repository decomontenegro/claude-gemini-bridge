# Guia Rápido - Claude-Gemini Bridge

## Como usar o Dashboard

### 1. Iniciar os serviços

**Terminal 1 - Servidor Backend:**
```bash
npm run server
```

**Terminal 2 - Dashboard Web:**
```bash
cd web
npm run dev
```

### 2. Acessar o Dashboard

Abra o navegador em: **http://localhost:3000**

### 3. Funcionalidades principais

#### Aba "Execute" (Executar)
Esta é a aba principal para executar tarefas:

1. **Tipo de Tarefa**: Escolha entre:
   - `Code` - Para tarefas de programação
   - `Search` - Para pesquisas
   - `Multimodal` - Para análise de imagens/mídia
   - `Analysis` - Para análise de dados
   - `Validation` - Para validação

2. **Descrição**: Digite o que você quer fazer
   - Exemplo: "Crie uma função em Python para calcular fibonacci"
   - Exemplo: "Analise este código e sugira melhorias"

3. **Orchestrator**: 
   - `Auto` - O sistema escolhe automaticamente
   - `Claude` - Usa apenas o Claude
   - `Gemini` - Usa apenas o Gemini

4. **Modo de Execução**:
   - `Single` - Usa apenas um AI
   - `Hybrid` - Usa ambos os AIs

5. Clique em **Execute Task**

#### Aba "Dashboard"
Mostra métricas e estatísticas do sistema:
- Status da conexão
- Tarefas em execução
- Performance

#### Aba "Config"
Configurações do sistema:
- Preferências
- Persona (newbie, individual, team, etc.)
- Configurações de API

#### Aba "Workflows"
Crie fluxos de trabalho automatizados

### 4. Exemplo prático

1. Vá para a aba **Execute**
2. Selecione tipo: **Code**
3. Digite: "Crie uma API REST simples em Node.js com Express"
4. Deixe Orchestrator em **Auto**
5. Clique em **Execute Task**

O sistema irá processar sua requisição e mostrar o resultado!

## Solução de Problemas

### "Failed to connect to backend server"
- Verifique se o servidor está rodando (Terminal 1)
- Verifique se está na porta 3001

### Dashboard não carrega
- Certifique-se que rodou `npm run dev` no diretório `web`
- Verifique se a porta 3000 está livre

### Tarefas não executam
- Verifique os logs no terminal do servidor
- Certifique-se que as variáveis de ambiente estão configuradas (.env)

## Dicas

- Use a aba **Tutorial** se for sua primeira vez
- O modo **Hybrid** é melhor para tarefas complexas
- **Auto** orchestrator escolhe o melhor AI para cada tarefa
- Seja específico nas descrições das tarefas

## Atalhos

- **Ctrl+Enter** - Executar tarefa (quando no campo de descrição)
- **Tab** - Navegar entre campos
- **Esc** - Cancelar execução

Pronto! Agora você pode usar o Claude-Gemini Bridge! 🚀