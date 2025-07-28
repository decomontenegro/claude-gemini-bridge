export enum AdapterType {
  CLAUDE = 'CLAUDE',
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
  COHERE = 'COHERE',
  HUGGINGFACE = 'HUGGINGFACE',
  LOCAL = 'LOCAL'
}

export const AdapterCapabilities: Record<AdapterType, string[]> = {
  [AdapterType.CLAUDE]: [
    'code_generation',
    'code_review',
    'debugging',
    'refactoring',
    'documentation',
    'testing',
    'architecture',
    'validation',
    'complex_reasoning',
    'nuanced_analysis'
  ],
  [AdapterType.GEMINI]: [
    'code_generation',
    'code_review',
    'debugging',
    'documentation',
    'architecture',
    'search',
    'multimodal',
    'web_search',
    'image_analysis',
    'pdf_processing'
  ],
  [AdapterType.OPENAI]: [
    'code_generation',
    'code_review',
    'debugging',
    'documentation',
    'chat',
    'function_calling',
    'vision',
    'embeddings'
  ],
  [AdapterType.COHERE]: [
    'code_generation',
    'text_generation',
    'summarization',
    'classification',
    'embeddings',
    'reranking'
  ],
  [AdapterType.HUGGINGFACE]: [
    'code_generation',
    'text_generation',
    'translation',
    'summarization',
    'question_answering',
    'image_generation',
    'embeddings'
  ],
  [AdapterType.LOCAL]: [
    'code_generation',
    'text_generation',
    'privacy',
    'customization',
    'offline'
  ]
};

export const AdapterStrengths: Record<AdapterType, string[]> = {
  [AdapterType.CLAUDE]: [
    'Deep code understanding',
    'Complex refactoring',
    'Thorough validation',
    'Nuanced explanations',
    'Best practices adherence'
  ],
  [AdapterType.GEMINI]: [
    'Multimodal processing',
    'Web search integration',
    'Fast responses',
    'Visual understanding',
    'Broad knowledge base'
  ],
  [AdapterType.OPENAI]: [
    'Versatile capabilities',
    'Function calling',
    'Strong reasoning',
    'Wide language support',
    'Latest GPT models'
  ],
  [AdapterType.COHERE]: [
    'Efficient embeddings',
    'Powerful reranking',
    'Multilingual support',
    'Enterprise features',
    'Customization options'
  ],
  [AdapterType.HUGGINGFACE]: [
    'Model variety',
    'Open source models',
    'Specialized tasks',
    'Community models',
    'Cost effective'
  ],
  [AdapterType.LOCAL]: [
    'Complete privacy',
    'No API costs',
    'Offline capability',
    'Full control',
    'Custom models'
  ]
};

export function getPreferredAdapterForTask(taskType: string): AdapterType | null {
  const preferences: Record<string, AdapterType> = {
    'refactoring': AdapterType.CLAUDE,
    'validation': AdapterType.CLAUDE,
    'testing': AdapterType.CLAUDE,
    'search': AdapterType.GEMINI,
    'multimodal': AdapterType.GEMINI
  };
  
  return preferences[taskType.toLowerCase()] || null;
}