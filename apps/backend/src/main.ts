import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get configuration service
  const configService = app.get(ConfigService);
  
  // Enable CORS
  app.enableCors({
    origin: configService.get('frontendUrl') || 'http://localhost:3000',
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));
  
  // Global prefix for API routes
  app.setGlobalPrefix('api');
  
  const port = configService.get('port') || 3001;
  await app.listen(port);
  console.log(`🚀 Backend server running on: http://localhost:${port}/api`);
  console.log(`🌍 Environment: ${configService.get('nodeEnv')}`);
  console.log(`🗄️  Database connected to: snapdocs-be`);
}

bootstrap();
