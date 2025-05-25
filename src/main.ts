import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';

import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { setupSwagger } from './swagger/swager-dev-tools';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await setupSwagger(app);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors();
  await app.listen(3333);
}
bootstrap();
