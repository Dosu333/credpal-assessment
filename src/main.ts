import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties that are not in the DTO (Security)
      forbidNonWhitelisted: true, // Throws error if unknown properties are sent
      transform: true, // Automatically transforms payloads to DTO instances
    }),
  );
}

bootstrap();
