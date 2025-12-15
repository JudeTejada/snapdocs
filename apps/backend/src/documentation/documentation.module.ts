import { Module } from '@nestjs/common';
import { DocumentationService } from './documentation.service';
import { DocumentationRepository } from './documentation.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DocumentationService, DocumentationRepository],
  exports: [DocumentationService, DocumentationRepository],
})
export class DocumentationModule {}
