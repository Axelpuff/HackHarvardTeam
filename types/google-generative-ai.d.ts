declare module '@google/generative-ai' {
  // Minimal type declarations used in this project.
  export interface GenerateContentResponseLike {
    text(): string;
  }
  export interface GenerateContentResult {
    response: GenerateContentResponseLike;
  }
  export interface ContentPartTextOnly {
    text: string;
  }
  export interface Content {
    role: string;
    parts: ContentPartTextOnly[];
  }
  export interface GenerateContentRequest {
    contents: Content[];
  }
  export interface GenerativeModel {
    generateContent(req: GenerateContentRequest): Promise<GenerateContentResult>;
  }
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(opts: { model: string }): GenerativeModel;
  }
}