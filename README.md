# Claude-Gemini Bridge 🤖🔗🤖

Sistema de integração bidirecional entre Claude CLI e Gemini CLI que combina o melhor dos dois assistentes de IA para desenvolvimento.

## Visão Geral

O Claude-Gemini Bridge permite que os dois CLIs trabalhem em conjunto, com um orquestrando o outro, criando um sistema mais poderoso que aprende e se adapta ao seu estilo de trabalho.

### Principais Benefícios

- **🎭 Orquestração Inteligente**: Cada CLI pode atuar como maestro, coordenando tarefas
- **🧠 Aprendizado Contínuo**: O sistema aprende com cada interação para melhorar resultados
- **👥 Adaptação por Persona**: Interface personalizada desde iniciantes até engenheiros sênior
- **⚡ Execução Híbrida**: Use ambos CLIs simultaneamente para resultados superiores
- **✅ Validação Cruzada**: Um CLI valida o trabalho do outro para maior confiabilidade

## Instalação

### Pré-requisitos

- Node.js 20 ou superior
- Claude CLI instalado (`npm install -g @anthropic-ai/claude-code`)
- Gemini CLI instalado (`npm install -g @google/gemini-cli`)

### Setup

```bash
# Clone o repositório
git clone https://github.com/your-username/claude-gemini-bridge.git
cd claude-gemini-bridge

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas API keys

# Build do projeto
npm run build

# Instale globalmente
npm install -g .
```

## Uso Rápido

### 1. Configure seu perfil
```bash
claude-gemini-bridge configure
```

### 2. Execute uma tarefa
```bash
# Orquestração automática
claude-gemini-bridge execute -t code

# Especificar orquestrador
claude-gemini-bridge execute -t multimodal -o gemini

# Execução híbrida
claude-gemini-bridge hybrid -t search
```

### 3. Modo interativo
```bash
claude-gemini-bridge interactive
```

## Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Claude CLI  │ ←→ │ Bridge Core  │ ←→ │ Gemini CLI  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌────▼─────┐
              │Orchestrator│ │Learning  │
              │  Manager   │ │ Module   │
              └───────────┘ └──────────┘
```

## Funcionalidades por Persona

### 🌱 Iniciante (Newbie)
- Tutorial interativo passo-a-passo
- Explicações detalhadas de cada ação
- Sugestões de próximos passos
- Modo de aprendizado ativo

### 💻 Desenvolvedor Individual
- Automação de tarefas repetitivas
- Templates pré-configurados
- Atalhos de produtividade
- Histórico de comandos

### 👥 Equipe
- Configurações compartilhadas
- Padrões de código consistentes
- Logs de auditoria
- Integração com ferramentas de equipe

### 🏢 Enterprise
- Compliance e segurança
- Integração CI/CD
- Métricas detalhadas
- Suporte a proxy corporativo

### 🔬 Pesquisador
- Processamento de grandes datasets
- Análise multimodal
- Visualizações avançadas
- Export de resultados

## Casos de Uso

### Desenvolvimento Full-Stack
```bash
# Crie uma aplicação completa
claude-gemini-bridge execute -t code
> "Create a full-stack todo app with React and Node.js"

# Claude: Estrutura e código backend
# Gemini: UI/UX e código frontend
# Bridge: Integração e validação
```

### Análise e Refatoração
```bash
# Analise e melhore código existente
claude-gemini-bridge hybrid -t analysis
> "Analyze performance bottlenecks in my Express app"

# Análise paralela com insights combinados
```

### Pesquisa e Implementação
```bash
# Pesquise e implemente soluções
claude-gemini-bridge execute -t search -o gemini
> "Find and implement the best authentication solution for Next.js"

# Gemini: Pesquisa opções
# Claude: Implementa a melhor escolha
```

## Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `execute` | Executa tarefa com orquestração inteligente |
| `hybrid` | Executa tarefa usando ambos CLIs em paralelo |
| `configure` | Configura preferências e persona |
| `learn` | Visualiza insights de aprendizado |
| `interactive` | Inicia modo interativo |

## Tipos de Tarefa

- **code**: Geração e edição de código
- **search**: Pesquisa e análise de informações
- **multimodal**: Processamento de imagens, PDFs, etc
- **analysis**: Análise de código e arquitetura
- **validation**: Validação e testes

## Configuração Avançada

### Regras de Orquestração Customizadas

```javascript
// custom-rules.js
export const customRules = [
  {
    condition: (task) => task.payload.language === 'python',
    targetCLI: 'claude',
    reason: 'Claude excels at Python'
  },
  {
    condition: (task) => task.payload.includes('image'),
    targetCLI: 'gemini',
    reason: 'Gemini has superior multimodal capabilities'
  }
];
```

### Hooks e Eventos

```javascript
bridge.on('taskCompleted', (result) => {
  console.log('Task completed:', result);
});

bridge.on('learningUpdate', (insights) => {
  console.log('New insights:', insights);
});
```

## Segurança

- Todas as comunicações são locais
- API keys armazenadas com segurança
- Logs sanitizados sem dados sensíveis
- Suporte a ambientes air-gapped

## Performance

- Cache inteligente de resultados
- Execução paralela quando possível
- Otimização baseada em padrões de uso
- Monitoramento de recursos

## Troubleshooting

### CLIs não encontrados
```bash
# Verifique instalação
which claude
which gemini

# Reinstale se necessário
npm install -g @anthropic-ai/claude-code
npm install -g @google/gemini-cli
```

### Erros de autenticação
```bash
# Verifique suas API keys
cat .env | grep API_KEY

# Teste conexão
claude-gemini-bridge test-connection
```

## Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma feature branch
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Roadmap

- [ ] Suporte a mais CLIs (GitHub Copilot, Codeium)
- [ ] Interface web
- [ ] Plugins customizáveis
- [ ] Modo offline melhorado
- [ ] Integração com mais IDEs

## Licença

MIT License - veja LICENSE para detalhes

## Suporte

- 📧 Email: support@claude-gemini-bridge.dev
- 💬 Discord: [Join our community](https://discord.gg/claude-gemini)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/claude-gemini-bridge/issues)

---

Feito com ❤️ para desenvolvedores que querem o melhor dos dois mundos