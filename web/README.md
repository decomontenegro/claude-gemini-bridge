# Claude-Gemini Bridge Web Interface

Uma interface web moderna e intuitiva para o Claude-Gemini Bridge, permitindo que usuários de todos os níveis utilizem o poder dos dois assistentes de IA.

## 🚀 Início Rápido

```bash
# Entre no diretório web
cd web

# Execute o setup
./setup-web.sh

# Inicie em modo desenvolvimento
npm run dev
```

Acesse http://localhost:3000

## 🎨 Recursos

### 1. **Task Executor** - Editor Visual de Tarefas
- Seleção visual de tipo de tarefa
- Escolha inteligente de orquestrador
- Modo híbrido para usar ambos CLIs
- Resultados em tempo real

### 2. **Dashboard** - Métricas e Insights
- Taxa de sucesso por CLI
- Tempos de execução
- Distribuição de tarefas
- Recomendações baseadas em IA

### 3. **Configuration** - Personalização Completa
- 5 personas pré-configuradas
- Níveis de verbosidade
- Automação configurável
- Tema claro/escuro

### 4. **Tutorial Mode** - Aprendizado Interativo
- Tour guiado pela interface
- Explicações passo a passo
- Dicas contextuais
- Modo sempre disponível

## 🛠️ Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilização moderna
- **Radix UI** - Componentes acessíveis
- **Socket.io** - Comunicação em tempo real
- **Recharts** - Visualização de dados
- **Framer Motion** - Animações suaves
- **Zustand** - Gerenciamento de estado

## 📁 Estrutura

```
web/
├── src/
│   ├── app/           # App Router pages
│   │   ├── api/       # API routes
│   │   └── page.tsx   # Home page
│   ├── components/    # React components
│   │   ├── ui/        # Reusable UI components
│   │   └── ...        # Feature components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities
│   └── store/         # Zustand stores
├── public/            # Static assets
├── server.js          # Custom server with WebSocket
└── package.json
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local`:

```env
# WebSocket
NEXT_PUBLIC_WS_URL=http://localhost:3000

# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Bridge CLI Path
BRIDGE_CLI_PATH=../../dist/index.js
```

### Personas Disponíveis

1. **Newbie** 🌱
   - Tutorial automático
   - Explicações detalhadas
   - Guia passo a passo

2. **Individual Developer** 💻
   - Interface produtiva
   - Atalhos rápidos
   - Foco em eficiência

3. **Team** 👥
   - Configurações compartilhadas
   - Histórico colaborativo
   - Padrões de equipe

4. **Enterprise** 🏢
   - Segurança avançada
   - Auditoria completa
   - Compliance

5. **Researcher** 🔬
   - Análise multimodal
   - Visualizações avançadas
   - Export de dados

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento com WebSocket
npm run dev

# Build de produção
npm run build

# Iniciar em produção
npm start

# Desenvolvimento sem WebSocket
npm run dev:next

# Linting
npm run lint
```

## 🔌 WebSocket Events

### Cliente → Servidor
- `join` - Entrar na sala do usuário
- `task:subscribe` - Inscrever em atualizações de tarefa
- `task:unsubscribe` - Cancelar inscrição

### Servidor → Cliente
- `task:progress` - Progresso da tarefa
- `task:complete` - Tarefa concluída
- `metrics:update` - Atualização de métricas
- `insight:new` - Novo insight de aprendizado

## 🎯 Uso da API

### Executar Tarefa
```javascript
POST /api/tasks/execute
{
  "type": "code",
  "description": "Create a React component",
  "orchestrator": "auto",
  "mode": "single"
}
```

### Salvar Configuração
```javascript
POST /api/config
{
  "persona": "individual",
  "preferences": {
    "verbosity": "normal",
    "guidance": true,
    "automation": "semi",
    "theme": "dark"
  }
}
```

### Obter Métricas
```javascript
GET /api/metrics
```

## 🔐 Segurança

- API keys nunca são expostas no frontend
- Configurações sensíveis mantidas no servidor
- Suporte a autenticação (em desenvolvimento)
- Logs sanitizados

## 🚧 Roadmap

- [ ] Autenticação completa
- [ ] Histórico persistente
- [ ] Compartilhamento de tarefas
- [ ] Exportação de resultados
- [ ] Modo offline
- [ ] PWA support

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

MIT License - veja LICENSE para detalhes