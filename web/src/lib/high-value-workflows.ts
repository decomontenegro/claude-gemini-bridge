export const HIGH_VALUE_WORKFLOWS = {
  // 1. SECURITY REVIEW - Onde você PRECISA de múltiplas perspectivas
  securityReview: {
    title: "Security Audit",
    description: "Both AIs analyze code for vulnerabilities",
    flow: [
      { ai: 'claude', task: 'Analyze code structure and logic flaws' },
      { ai: 'gemini', task: 'Search for known CVEs and security patterns' },
      { ai: 'both', task: 'Cross-validate findings and prioritize' }
    ],
    value: "Catch vulnerabilities that one AI might miss"
  },

  // 2. ARCHITECTURE DECISION - Quando a decisão é crítica
  architectureDecision: {
    title: "Architecture Planning",
    description: "Get multiple perspectives on system design",
    flow: [
      { ai: 'gemini', task: 'Research current best practices and trends' },
      { ai: 'claude', task: 'Design detailed implementation plan' },
      { ai: 'both', task: 'Validate scalability and maintainability' }
    ],
    value: "Make informed decisions with comprehensive analysis"
  },

  // 3. COMPLEX DEBUG - Quando você está travado
  complexDebug: {
    title: "Advanced Debugging",
    description: "Two AIs working together to solve tough bugs",
    flow: [
      { ai: 'claude', task: 'Analyze code logic and trace execution' },
      { ai: 'gemini', task: 'Search for similar issues and solutions' },
      { ai: 'both', task: 'Propose and validate fixes' }
    ],
    value: "Solve bugs faster with dual analysis"
  },

  // 4. LEARNING ACCELERATOR - Quando você quer dominar algo
  learningAccelerator: {
    title: "Deep Learning Mode",
    description: "Learn concepts thoroughly with dual explanations",
    flow: [
      { ai: 'gemini', task: 'Explain concept with examples and visuals' },
      { ai: 'claude', task: 'Provide detailed implementation and edge cases' },
      { ai: 'both', task: 'Answer follow-up questions from different angles' }
    ],
    value: "Understand deeply through multiple perspectives"
  },

  // 5. CODE MIGRATION - Quando precisão é crucial
  codeMigration: {
    title: "Safe Migration",
    description: "Migrate code with confidence",
    flow: [
      { ai: 'claude', task: 'Convert code maintaining logic integrity' },
      { ai: 'gemini', task: 'Optimize for target platform best practices' },
      { ai: 'both', task: 'Validate functional equivalence' }
    ],
    value: "Ensure nothing breaks during migration"
  },

  // 6. PERFORMANCE OPTIMIZATION - Quando cada ms conta
  performanceOptimization: {
    title: "Performance Tuning",
    description: "Optimize code with dual analysis",
    flow: [
      { ai: 'gemini', task: 'Identify bottlenecks and suggest algorithms' },
      { ai: 'claude', task: 'Implement optimizations maintaining readability' },
      { ai: 'both', task: 'Benchmark and validate improvements' }
    ],
    value: "Get the fastest solution that's still maintainable"
  }
}