export enum CompressionType {
  EMBEDDINGS = 'EMBEDDINGS',
  SUMMARY = 'SUMMARY',
  HYBRID = 'HYBRID'
}

export interface CompressionStrategy {
  type: CompressionType;
  description: string;
  compressionRatio: number; // Expected compression ratio (0-1)
  preservesSemantics: boolean;
  supportsSimilaritySearch: boolean;
}

export const CompressionStrategies: Record<CompressionType, CompressionStrategy> = {
  [CompressionType.EMBEDDINGS]: {
    type: CompressionType.EMBEDDINGS,
    description: 'Converts text to dense vector representations for semantic similarity',
    compressionRatio: 0.05, // Very high compression
    preservesSemantics: true,
    supportsSimilaritySearch: true
  },
  [CompressionType.SUMMARY]: {
    type: CompressionType.SUMMARY,
    description: 'Generates concise textual summaries preserving key information',
    compressionRatio: 0.1, // 90% reduction
    preservesSemantics: true,
    supportsSimilaritySearch: false
  },
  [CompressionType.HYBRID]: {
    type: CompressionType.HYBRID,
    description: 'Combines embeddings with summaries for optimal balance',
    compressionRatio: 0.15, // 85% reduction
    preservesSemantics: true,
    supportsSimilaritySearch: true
  }
};

export function getOptimalCompressionType(
  contentSize: number,
  requiresSimilaritySearch: boolean,
  preserveReadability: boolean
): CompressionType {
  if (requiresSimilaritySearch && !preserveReadability) {
    return CompressionType.EMBEDDINGS;
  }
  
  if (preserveReadability && !requiresSimilaritySearch) {
    return CompressionType.SUMMARY;
  }
  
  return CompressionType.HYBRID;
}