# UltraThink Mode 🧠

## O que é o UltraThink?

O UltraThink é um novo modo de execução generalista que combina as capacidades de todos os outros tipos de tarefas. Ele instrui os AIs a:

- Pensar profundamente sobre o problema
- Analisar de múltiplas perspectivas
- Fornecer soluções completas e detalhadas
- Incluir exemplos de código, diagramas e explicações
- Considerar casos extremos e melhores práticas

## Como usar

### 1. No Dashboard Web

Na aba **Execute**:
1. Selecione **Task Type**: `Ultrathink` (ícone do cérebro)
2. Digite sua pergunta ou problema complexo
3. Clique em **Execute Task**

### 2. Via CLI

```bash
claude-gemini execute -t ultrathink
```

### 3. Via API

```json
POST /api/v1/tasks
{
  "task": {
    "type": "ultrathink",
    "payload": {
      "description": "Sua pergunta complexa aqui"
    }
  },
  "options": {
    "orchestrator": "auto"
  }
}
```

## Exemplos de uso

### Exemplo 1: Arquitetura de Sistema
```
"Projete uma arquitetura completa para um sistema de e-commerce escalável, incluindo frontend, backend, banco de dados, cache, filas e infraestrutura"
```

### Exemplo 2: Solução de Problema Complexo
```
"Tenho um problema de performance em minha aplicação React que só aparece em produção. Como posso diagnosticar e resolver?"
```

### Exemplo 3: Aprendizado Profundo
```
"Explique como funcionam redes neurais, com exemplos práticos de implementação e casos de uso"
```

## Diferenças dos outros modos

- **Code**: Focado apenas em gerar código
- **Search**: Focado em buscar informações
- **Analysis**: Focado em analisar código existente
- **Validation**: Focado em validar resultados
- **Multimodal**: Focado em processar múltiplos tipos de entrada

**UltraThink**: Combina TODOS os anteriores em uma análise profunda e completa

## Workflows com UltraThink

Os workflows agora usam automaticamente o modo UltraThink para executar cada passo, garantindo:
- Análises mais completas
- Melhores resultados
- Conexão entre os passos do workflow

## Tempo de execução

O modo UltraThink pode levar mais tempo (5-10 segundos) devido à profundidade da análise, mas fornece resultados significativamente melhores.

## Dicas

1. Use para problemas complexos que requerem análise profunda
2. Seja específico na descrição do problema
3. Ideal para decisões arquiteturais importantes
4. Perfeito para aprender conceitos novos em profundidade
5. Excelente para debugging de problemas difíceis

## Limitações

- Pode ser excessivo para tarefas simples
- Consome mais tokens da API
- Tempo de resposta maior

Use com sabedoria! 🚀