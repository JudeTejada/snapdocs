import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("ai.geminiApiKey");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.initializeModel();
  }

  private initializeModel() {
    const modelName = this.configService.get<string>(
      "ai.geminiModel",
      "gemini-2.5-flash",
    );
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.3, // Lower = more consistent docs
        maxOutputTokens: 8192,
        topP: 0.95,
      },
    });
  }

  async generateDocumentation(
    diff: string,
    metadata: {
      repo: string;
      prNumber: number;
      author: string;
      title: string;
    },
  ): Promise<string> {
    const prompt = this.buildPrompt(diff, metadata);

    try {
      // Free tier: 10-15 RPM. Add delay if needed
      await this.enforceRateLimit();

      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      this.handleError(error);
    }
  }

  private buildPrompt(diff: string, metadata: any): string {
    return `
You are a senior technical documentation writer. Generate comprehensive docs for this merged PR.

PR DETAILS:
- Repository: ${metadata.repo}
- PR #${metadata.prNumber} by @${metadata.author}
- Title: ${metadata.title}

DIFF CONTENT:
${diff}

OUTPUT FORMAT (Markdown):
1. **Executive Summary** (2-3 sentences)
2. **What Changed & Why**
3. **File-by-File Minimap**
4. **Code Snippets** (before/after)
5. **Developer Notes** (if breaking changes)
6. **Changelog Entry**
7. **Breaking Changes Alert** (if applicable)
    `.trim();
  }

  private async enforceRateLimit() {
    // Free tier safety: 1 request per second
    // Remove this when you upgrade to paid tier
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private handleError(error: any): never {
    if (error.message?.includes("429")) {
      this.logger.error("Rate limit hit! Consider upgrading to paid tier.");
      throw new Error("GEMINI_RATE_LIMIT_EXCEEDED");
    }
    this.logger.error(`Gemini API error: ${error.message}`);
    throw error;
  }
}
