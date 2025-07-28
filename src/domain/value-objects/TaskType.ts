export enum TaskType {
  CODE_GENERATION = 'CODE_GENERATION',
  CODE_REVIEW = 'CODE_REVIEW',
  DEBUGGING = 'DEBUGGING',
  REFACTORING = 'REFACTORING',
  DOCUMENTATION = 'DOCUMENTATION',
  TESTING = 'TESTING',
  ARCHITECTURE = 'ARCHITECTURE',
  SEARCH = 'SEARCH',
  MULTIMODAL = 'MULTIMODAL',
  VALIDATION = 'VALIDATION'
}

export const TaskTypeDescriptions: Record<TaskType, string> = {
  [TaskType.CODE_GENERATION]: 'Generate code based on requirements',
  [TaskType.CODE_REVIEW]: 'Review code for quality and best practices',
  [TaskType.DEBUGGING]: 'Debug and fix code issues',
  [TaskType.REFACTORING]: 'Refactor code for better structure',
  [TaskType.DOCUMENTATION]: 'Generate or improve documentation',
  [TaskType.TESTING]: 'Create or improve tests',
  [TaskType.ARCHITECTURE]: 'Design system architecture',
  [TaskType.SEARCH]: 'Search for information or code',
  [TaskType.MULTIMODAL]: 'Process images, PDFs, or other media',
  [TaskType.VALIDATION]: 'Validate code or results'
};

export const TaskTypeCapabilities: Record<TaskType, string[]> = {
  [TaskType.CODE_GENERATION]: ['syntax', 'logic', 'patterns'],
  [TaskType.CODE_REVIEW]: ['quality', 'security', 'performance'],
  [TaskType.DEBUGGING]: ['errors', 'logic', 'performance'],
  [TaskType.REFACTORING]: ['structure', 'patterns', 'readability'],
  [TaskType.DOCUMENTATION]: ['clarity', 'completeness', 'examples'],
  [TaskType.TESTING]: ['coverage', 'edge-cases', 'assertions'],
  [TaskType.ARCHITECTURE]: ['scalability', 'patterns', 'design'],
  [TaskType.SEARCH]: ['relevance', 'accuracy', 'comprehensiveness'],
  [TaskType.MULTIMODAL]: ['vision', 'ocr', 'analysis'],
  [TaskType.VALIDATION]: ['correctness', 'consistency', 'standards']
};