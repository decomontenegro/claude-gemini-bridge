# Guia Completo - Claude-Gemini Bridge com Interface Web

## 🎯 Visão Geral

O Claude-Gemini Bridge agora possui uma interface web completa que torna o sistema acessível para todos os níveis de usuários - desde iniciantes até engenheiros enterprise.

## 🚀 Instalação Completa

### 1. Setup do Sistema Base

```bash
# Clone ou navegue até o diretório do projeto
cd claude-gemini-bridge

# Instale as dependências do bridge
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas API keys

# Build do sistema
npm run build
```

### 2. Setup da Interface Web

```bash
# Entre no diretório web
cd web

# Execute o setup automático
./setup-web.sh

# Ou manualmente:
npm install
npm run build
```

### 3. Iniciar o Sistema Completo

```bash
# Terminal 1: Inicie o bridge (se quiser usar CLI)
cd claude-gemini-bridge
./run.sh

# Terminal 2: Inicie a interface web
cd web
npm run dev
```

Acesse: http://localhost:3000

## 🎨 Interface Web - Recursos Detalhados

### Task Executor (Executor de Tarefas)
- **Tipos de Tarefa**: Code, Search, Multimodal, Analysis, Validation
- **Modos de Execução**: Single CLI ou Hybrid (ambos)
- **Orquestração**: Automática ou manual (Claude/Gemini)
- **Feedback Visual**: Resultados em tempo real com indicadores visuais

### Dashboard (Painel de Controle)
- **Métricas em Tempo Real**: Taxa de sucesso, tempos de execução
- **Gráficos Interativos**: Performance trends, distribuição de tarefas
- **Insights de IA**: Recomendações baseadas em padrões de uso
- **Comparação de CLIs**: Veja qual CLI performa melhor para cada tipo

### Configuration (Configuração)
- **Personas**: 5 perfis pré-configurados
- **Preferências**: Verbosidade, automação, tema
- **API Keys**: Configure de forma segura
- **Enterprise**: Opções avançadas de segurança

### Tutorial Mode (Modo Tutorial)
- **Tour Guiado**: 6 passos interativos
- **Aprendizado Progressivo**: Do básico ao avançado
- **Sempre Disponível**: Acesse a qualquer momento
- **Contextual**: Dicas baseadas na sua persona

## 🔧 Uso via Terminal (CLI)

### Comandos Básicos

```bash
# Execute uma tarefa
./run.sh execute -t code
> "Create a React hook for dark mode"

# Modo híbrido
./run.sh hybrid -t search
> "Find the best authentication library for Next.js"

# Configure via CLI
./run.sh configure
```

### Exemplos Avançados

```bash
# Especificar orquestrador
./run.sh execute -t multimodal -o gemini
> "Analyze this architecture diagram and suggest improvements"

# Ver insights de aprendizado
./run.sh learn
```

## 🌐 Uso via Web API

### Endpoints Disponíveis

#### 1. Executar Tarefa
```javascript
POST http://localhost:3000/api/tasks/execute
{
  "type": "code",
  "description": "Create a Python data validation class",
  "orchestrator": "auto",
  "mode": "single"
}
```

#### 2. Configurar Sistema
```javascript
POST http://localhost:3000/api/config
{
  "persona": "researcher",
  "preferences": {
    "verbosity": "detailed",
    "guidance": true,
    "automation": "semi"
  }
}
```

#### 3. Obter Métricas
```javascript
GET http://localhost:3000/api/metrics
```

### WebSocket para Tempo Real

```javascript
const socket = io('http://localhost:3000');

// Inscrever em atualizações de tarefa
socket.emit('task:subscribe', taskId);

// Receber progresso
socket.on('task:progress', (data) => {
  console.log('Progress:', data.progress);
});
```

## 👥 Guia por Persona

### 🌱 Iniciante (Newbie)

1. **Primeiro Acesso**: Tutorial automático inicia
2. **Interface Simplificada**: Apenas opções essenciais
3. **Explicações Detalhadas**: Cada ação é explicada
4. **Sugestões**: Sistema sugere próximos passos

**Exemplo de Uso**:
- Acesse http://localhost:3000
- Complete o tutorial
- Tente: "Create my first HTML page"
- Sistema explica cada passo

### 💻 Desenvolvedor Individual

1. **Produtividade**: Interface otimizada para velocidade
2. **Atalhos**: Acesso rápido às funções principais
3. **Histórico**: Reutilize tarefas anteriores
4. **Personalização**: Ajuste para seu workflow

**Exemplo de Uso**:
- Configure teclas de atalho
- Use templates salvos
- Execute tarefas em lote

### 👥 Equipe

1. **Configurações Compartilhadas**: Um setup para todos
2. **Padrões**: Enforce coding standards
3. **Colaboração**: Veja o que outros fizeram
4. **Relatórios**: Métricas da equipe

**Exemplo de Uso**:
- Configure padrões da empresa
- Compartilhe templates
- Monitore uso da equipe

### 🏢 Enterprise

1. **Segurança**: Autenticação e autorização
2. **Compliance**: Logs de auditoria
3. **Integração**: CI/CD, SSO
4. **Suporte**: SLA garantido

**Exemplo de Uso**:
- Integre com AD/LDAP
- Configure políticas
- Monitore compliance

### 🔬 Pesquisador

1. **Análise Multimodal**: Processe datasets complexos
2. **Visualizações**: Gráficos avançados
3. **Export**: Múltiplos formatos
4. **Notebooks**: Integração Jupyter

**Exemplo de Uso**:
- Analise papers em PDF
- Processe imagens médicas
- Gere relatórios científicos

## 📊 Métricas e Aprendizado

### O Sistema Aprende

1. **Padrões de Sucesso**: Identifica o que funciona
2. **Otimização Automática**: Ajusta rotas baseado em performance
3. **Sugestões Personalizadas**: Baseadas no seu uso
4. **Prevenção de Erros**: Avisa sobre possíveis problemas

### Visualize o Aprendizado

- Dashboard → Learning Insights
- Veja recomendações em tempo real
- Export relatórios de otimização

## 🔒 Segurança e Privacidade

### Medidas Implementadas

1. **API Keys Seguras**: Nunca expostas no frontend
2. **Logs Sanitizados**: Sem dados sensíveis
3. **Isolamento**: Cada usuário em ambiente separado
4. **Criptografia**: Dados em trânsito e repouso

### Configuração de Segurança

```bash
# Para ambiente de produção
NODE_ENV=production npm start

# Com HTTPS
HTTPS=true npm start
```

## 🚀 Deploy em Produção

### 1. Build de Produção

```bash
# Build do bridge
cd claude-gemini-bridge
npm run build

# Build da web
cd web
npm run build
```

### 2. Configuração de Servidor

```nginx
# nginx.conf exemplo
server {
    listen 443 ssl;
    server_name bridge.yourcompany.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

### 3. Process Manager

```bash
# Use PM2 para gerenciar processos
npm install -g pm2

# Inicie os serviços
pm2 start ecosystem.config.js
```

## 📈 Monitoramento

### Métricas Disponíveis

1. **Performance**: Latência, throughput
2. **Erros**: Taxa de falha por tipo
3. **Uso**: Requests por usuário/tipo
4. **Custos**: Estimativa de API calls

### Integração com Ferramentas

- **Grafana**: Dashboards customizados
- **Prometheus**: Coleta de métricas
- **ELK Stack**: Análise de logs
- **Datadog**: APM completo

## 🆘 Troubleshooting

### Problemas Comuns

**1. "Claude/Gemini CLI not found"**
```bash
# Verifique instalação
which claude
which gemini

# Reinstale se necessário
npm install -g @anthropic-ai/claude-code
npm install -g @google/gemini-cli
```

**2. "WebSocket connection failed"**
```bash
# Verifique se o servidor está rodando
npm run dev  # Não use dev:next

# Verifique firewall/proxy
```

**3. "API key invalid"**
```bash
# Verifique .env
cat .env | grep API_KEY

# Teste diretamente
curl -H "Authorization: Bearer YOUR_KEY" ...
```

## 🎯 Casos de Uso Reais

### 1. Desenvolvimento de Feature Completa
```
Web: Task Executor → Code → "Create a complete user authentication system"
- Claude: Cria backend seguro
- Gemini: Pesquisa best practices
- Bridge: Combina e valida
```

### 2. Análise de Codebase
```
CLI: ./run.sh analysis
> "Find all security vulnerabilities in my Express app"
- Análise paralela
- Relatório consolidado
```

### 3. Migração de Tecnologia
```
Web: Hybrid Mode → "Migrate from JavaScript to TypeScript"
- Claude: Converte código
- Gemini: Busca tipos corretos
- Validação cruzada
```

## 🚀 Próximos Passos

1. **Explore a Interface**: Teste todos os recursos
2. **Configure sua Persona**: Personalize a experiência
3. **Execute Tarefas**: Comece com algo simples
4. **Analise Métricas**: Veja como melhorar
5. **Compartilhe Feedback**: Ajude a melhorar o sistema

## 📚 Recursos Adicionais

- [Documentação da API](./web/README.md)
- [Arquitetura do Sistema](./ARCHITECTURE.md)
- [Exemplos de Código](./examples/)
- [Contribuindo](./CONTRIBUTING.md)

---

**Suporte**: support@claude-gemini-bridge.dev
**Community**: discord.gg/claude-gemini
**Updates**: @ClaudeGeminiBridge

Feito com ❤️ para revolucionar o desenvolvimento com IA