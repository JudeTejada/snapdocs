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

    return this.documentationRepository.upsertDocumentation({
      prId: pullRequest.id,
      summary: dto.documentation,
      json: null,
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

  private validateDto<T>(payload: T, cls: new () => any): T {
    const instance = plainToInstance(cls, payload);
    const errors = validateSync(instance as object, { whitelist: true, forbidUnknownValues: true });

    if (errors.length) {
      throw new BadRequestException(errors);
    }

    return instance as T;
  }
}
