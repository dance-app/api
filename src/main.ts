import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';

import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { setupSwagger } from './swagger/swager-dev-tools';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await setupSwagger(app);

  const frontendOrigin =
    process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors({
    origin: [frontendOrigin],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  });
  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📖 Swagger docs available at: http://localhost:${port}/docs`);
}
bootstrap();
