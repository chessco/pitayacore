export interface ImageGenerationResult {
  imageUrl: string;
  buffer?: Buffer;
  contentType?: string;
  width?: number;
  height?: number;
  prompt: string;
}

export interface IImageProvider {
  generateImage(prompt: string, options?: any): Promise<ImageGenerationResult>;
}
