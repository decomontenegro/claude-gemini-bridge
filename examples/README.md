# Exemplos de Uso - Claude-Gemini Bridge

## 1. Desenvolvimento Multimodal

### Cenário: Criar app a partir de um sketch
```bash
# Gemini processa a imagem, Claude gera o código
claude-gemini-bridge execute -t multimodal

# O sistema automaticamente:
# 1. Usa Gemini para analisar o sketch/PDF
# 2. Passa a análise para Claude gerar o código
# 3. Valida o resultado com ambos os CLIs
```

## 2. Pesquisa Híbrida

### Cenário: Buscar e implementar uma biblioteca
```bash
# Execução híbrida para máxima cobertura
claude-gemini-bridge hybrid -t search

# Descrição: "Find the best React animation library and implement a fade-in component"
# - Gemini: Busca na web por bibliotecas populares
# - Claude: Analisa o código e implementa o componente
# - Sistema: Merge dos resultados e validação cruzada
```

## 3. Análise de Código Complexo

### Cenário: Refatorar uma base de código legada
```bash
# Claude orquestra com sua expertise em código
claude-gemini-bridge execute -t analysis -o claude

# O sistema:
# 1. Claude analisa a estrutura do código
# 2. Gemini busca padrões modernos e best practices
# 3. Claude implementa as refatorações
# 4. Validação mútua das mudanças
```

## 4. Modo Interativo para Iniciantes

```bash
claude-gemini-bridge interactive

> help me create my first web app
# Sistema detecta persona "newbie"
# Ativa modo tutorial com explicações detalhadas
# Usa Gemini para recursos visuais
# Claude para implementação passo-a-passo

> explain what each file does
# Análise colaborativa:
# - Claude explica o código
# - Gemini busca recursos adicionais
# - Sistema sugere próximos passos
```

## 5. Enterprise: CI/CD Pipeline

### Cenário: Configurar pipeline completo
```bash
# Configurar para modo enterprise
claude-gemini-bridge configure
# Selecionar: Enterprise Engineer

# Executar tarefa complexa
claude-gemini-bridge execute -t code

# Descrição: "Setup complete CI/CD with tests, security scans, and deployment"
# Sistema automaticamente:
# - Divide tarefas entre CLIs baseado em expertise
# - Claude: GitHub Actions, testes
# - Gemini: Pesquisa ferramentas de segurança
# - Validação cruzada de configurações
# - Geração de documentação
```

## 6. Pesquisa Científica

### Cenário: Análise de dados com visualização
```bash
claude-gemini-bridge execute -t multimodal -o gemini

# Input: Dataset CSV + "Create ML model with visualizations"
# - Gemini: Processa dados e gera visualizações
# - Claude: Implementa modelo ML
# - Sistema: Combina insights e código
```

## 7. Debug Colaborativo

```bash
# Quando um erro complexo aparece
claude-gemini-bridge execute -t analysis

# Descrição: "Debug TypeError in async function handleUserData"
# - Claude: Analisa stack trace e código
# - Gemini: Busca soluções similares online
# - Sistema: Propõe múltiplas soluções ranqueadas
```

## 8. Aprendizado Adaptativo

```bash
# Ver insights de performance
claude-gemini-bridge learn

# Output mostra:
# - Tarefas multimodais: 95% sucesso com Gemini
# - Refatoração de código: 93% sucesso com Claude
# - Recomendações personalizadas baseadas no uso
```

## Scripts de Exemplo

### exemplo-basico.js
```javascript
import { ClaudeGeminiBridge } from 'claude-gemini-bridge';

const bridge = new ClaudeGeminiBridge({
  claudeApiKey: process.env.CLAUDE_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY
});

// Tarefa simples
const result = await bridge.execute({
  type: 'code',
  description: 'Create a React hook for dark mode'
});

console.log(result);
```

### exemplo-avancado.js
```javascript
// Orquestração customizada
const orchestrator = bridge.getOrchestrator();

orchestrator.addRule({
  condition: (task) => task.payload.includes('performance'),
  targetCLI: 'gemini',
  transform: (task) => ({
    ...task,
    payload: { ...task.payload, includeMetrics: true }
  })
});

// Execução híbrida com callbacks
const hybridResult = await bridge.hybridExecute({
  type: 'analysis',
  payload: {
    code: await fs.readFile('./legacy-app.js'),
    requirements: 'Modernize and optimize for performance'
  },
  onProgress: (update) => console.log(update),
  onCLIResponse: (cli, response) => {
    console.log(`${cli} responded:`, response);
  }
});
```

## Configurações por Persona

### newbie-config.json
```json
{
  "persona": "newbie",
  "preferences": {
    "verbosity": "detailed",
    "guidance": true,
    "automation": "manual",
    "showExplanations": true,
    "suggestNextSteps": true
  }
}
```

### enterprise-config.json
```json
{
  "persona": "enterprise",
  "preferences": {
    "verbosity": "minimal",
    "guidance": false,
    "automation": "full",
    "security": "strict",
    "compliance": true,
    "auditLog": true
  }
}