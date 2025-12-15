import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

interface PRSummaryMetadata {
  repo: string;
  prNumber: number;
  author: string;
  title: string;
  fileStats?: {
    totalFiles: number;
    additions: number;
    deletions: number;
    addedCount: number;
    modifiedCount: number;
    deletedCount: number;
    renamedCount: number;
    touchedAreas: string[];
  };
}

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

  /**
   * Generate a structured PR summary for opened PRs.
   * Returns JSON with summary, key changes, files changed, and risk level.
   */
  async generatePRSummary(
    diff: string,
    metadata: PRSummaryMetadata,
  ): Promise<PRSummaryResult> {
    const prompt = this.buildSummaryPrompt(diff, metadata);

    try {
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
      const text = response.text();

      // Parse JSON from response
      return this.parseSummaryResponse(text, metadata);
    } catch (error) {
      this.handleError(error);
    }
  }

  private buildSummaryPrompt(
    diff: string,
    metadata: PRSummaryMetadata,
  ): string {
    // Truncate diff if too large (to stay within token limits)
    const maxDiffLength = 15000;
    const truncatedDiff =
      diff.length > maxDiffLength
        ? diff.substring(0, maxDiffLength) + "\n\n[...truncated]"
        : diff;

    const scopeDetails = metadata.fileStats
      ? `
PR SCOPE:
- Files changed: ${metadata.fileStats.totalFiles}
- Additions/Deletions: +${metadata.fileStats.additions} / -${metadata.fileStats.deletions}
- Change mix: added ${metadata.fileStats.addedCount}, modified ${metadata.fileStats.modifiedCount}${metadata.fileStats.renamedCount ? `, renamed ${metadata.fileStats.renamedCount}` : ""}, deleted ${metadata.fileStats.deletedCount}
- Areas touched: ${metadata.fileStats.touchedAreas.join(", ")}
`.trim()
      : "";

    return `
You are a code review assistant. Analyze this PR and generate a concise but high-context summary that helps a reviewer understand intent, scope, and impact without reading the full diff.

PR DETAILS:
- Repository: ${metadata.repo}
- PR #${metadata.prNumber} by @${metadata.author}
- Title: ${metadata.title}
${scopeDetails ? `\n${scopeDetails}\n` : ""}

DIFF:
${truncatedDiff}

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown):
{
  "summary": "3-5 sentence overview of what this PR does, why it matters, and the breadth of change",
  "keyChanges": ["change 1", "change 2", "change 3"],
  "filesChanged": [{"name": "filename.ts", "changeType": "modified"}],
  "breakingChanges": false,
  "riskLevel": "low"
}

RULES:
- summary: Tie together intent, user-facing/operational impact, and scope (reference the provided file counts instead of enumerating files)
- keyChanges: Up to 3 concise bullets that add clarity beyond the summary; leave empty if redundant
- filesChanged: Only include when you are confident; prefer an empty array over guessing
- breakingChanges: true if there are breaking API or schema changes
- riskLevel: "low", "medium", or "high" based on complexity and potential impact
    `.trim();
  }

  private parseSummaryResponse(
    text: string,
    metadata: PRSummaryMetadata,
  ): PRSummaryResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = text;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr.trim());

      return {
        summary: parsed.summary || "No summary available",
        keyChanges: parsed.keyChanges || [],
        filesChanged: parsed.filesChanged || [],
        breakingChanges: parsed.breakingChanges || false,
        riskLevel: parsed.riskLevel || "low",
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to parse JSON summary for PR #${metadata.prNumber}, using fallback`,
      );

      // Return fallback if parsing fails
      return {
        summary: text.substring(0, 500),
        keyChanges: [],
        filesChanged: [],
        breakingChanges: false,
        riskLevel: "low",
        generatedAt: new Date().toISOString(),
      };
    }
  }
}

export interface PRSummaryResult {
  summary: string;
  keyChanges: string[];
  filesChanged: Array<{ name: string; changeType: "added" | "modified" | "deleted" }>;
  breakingChanges: boolean;
  riskLevel: "low" | "medium" | "high";
  generatedAt: string;
}
