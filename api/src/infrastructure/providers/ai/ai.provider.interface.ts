export interface VisionAnalysisResult {
  text?: string;
  structuredData?: any;
  confidenceScore?: number;
}

export interface IAiProvider {
  analyzeImage(
    imageUrl: string,
    prompt: string,
    systemInstruction?: string,
  ): Promise<VisionAnalysisResult>;
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
  generateStructuredData<T>(
    prompt: string,
    schema: any,
    systemInstruction?: string,
  ): Promise<T>;
}
