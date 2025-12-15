import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DocumentationRepository } from './documentation.repository';
import { SaveDocumentationDto } from './dto/save-documentation.dto';
import { SaveSummaryDto } from './dto/save-summary.dto';

@Injectable()
export class DocumentationService {
  constructor(private readonly documentationRepository: DocumentationRepository) {}

  async saveDocumentationForPullRequest(params: SaveDocumentationDto) {
    const dto = this.validateDto(params, SaveDocumentationDto);

    const repo = await this.documentationRepository.findRepository(
      dto.repository.owner,
      dto.repository.name,
    );

    if (!repo) {
      throw new NotFoundException(
        `Repository ${dto.repository.owner}/${dto.repository.name} not found in system. Ensure GitHub sync has run before generating docs.`,
      );
    }

    const pullRequest = await this.documentationRepository.upsertPullRequest(repo.id, {
      number: dto.pullRequest.number,
      title: dto.pullRequest.title,
      author: dto.pullRequest.author,
      mergedAt: dto.pullRequest.mergedAt,
      state: dto.pullRequest.state,
      sha: dto.pullRequest.sha,
    });

    // Extract a summary from the documentation for the json field
    // This ensures the frontend can detect that documentation exists
    const summaryJson = this.extractSummaryFromDocumentation(dto.documentation);

    return this.documentationRepository.upsertDocumentation({
      prId: pullRequest.id,
      summary: dto.documentation,
      json: summaryJson,
    });
  }

  async saveSummary(prId: string, summary: { summary: string; json?: Record<string, unknown> }) {
    const dto = this.validateDto({ prId, ...summary }, SaveSummaryDto);

    await this.documentationRepository.ensurePullRequestExists(dto.prId);

    return this.documentationRepository.upsertDocumentation({
      prId: dto.prId,
      summary: dto.summary,
      json: dto.json ?? (summary as Record<string, unknown>),
    });
  }

  /**
   * Extract a structured summary from markdown documentation.
   * This creates a json representation that matches the PRSummaryResult interface
   * expected by the frontend.
   */
  private extractSummaryFromDocumentation(documentation: string): Record<string, unknown> {
    // Extract the executive summary section if present
    let summary = '';
    const summaryMatch = documentation.match(/\*\*Executive Summary\*\*[\s\S]*?(?=\n\*\*|$)/i)
      || documentation.match(/Executive Summary[\s\S]*?(?=\n##|$)/i);

    if (summaryMatch) {
      summary = summaryMatch[0]
        .replace(/\*\*Executive Summary\*\*/i, '')
        .replace(/^#+\s*Executive Summary/i, '')
        .trim()
        .substring(0, 500);
    } else {
      // Fallback: use the first 500 characters of the documentation
      summary = documentation.substring(0, 500).trim();
    }

    // Extract key changes from "What Changed" section
    const keyChanges: string[] = [];
    const changesMatch = documentation.match(/\*\*What Changed[\s\S]*?(?=\n\*\*|$)/i)
      || documentation.match(/## What Changed[\s\S]*?(?=\n##|$)/i);

    if (changesMatch) {
      const changeLines = changesMatch[0].split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'));
      changeLines.slice(0, 5).forEach(line => {
        const cleanedLine = line.replace(/^[-*]\s*/, '').trim();
        if (cleanedLine) {
          keyChanges.push(cleanedLine);
        }
      });
    }

    // Check for breaking changes
    const breakingChanges = /breaking change/i.test(documentation) || /\*\*Breaking/i.test(documentation);

    // Determine risk level based on content
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (breakingChanges) {
      riskLevel = 'high';
    } else if (/major change|significant|refactor|migration/i.test(documentation)) {
      riskLevel = 'medium';
    }

    return {
      summary,
      keyChanges,
      filesChanged: [],
      breakingChanges,
      riskLevel,
      generatedAt: new Date().toISOString(),
    };
  }

  private validateDto<T>(payload: T, cls: new () => any): T {
    const instance = plainToInstance(cls, payload);
    const errors = validateSync(instance as object, { whitelist: true, forbidUnknownValues: true });

    if (errors.length) {
      throw new BadRequestException(errors);
    }

    return instance as T;
  }
}
