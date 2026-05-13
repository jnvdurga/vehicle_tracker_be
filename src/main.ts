import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // ✅ THIS IS MISSING
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalFilters(new ThrottlerExceptionFilter())

  const port = process.env.PORT ?? 3000;
  const server = app.getHttpServer();

  // Allow socket reuse to avoid EADDRINUSE errors
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Retrying in 2 seconds...`);
      setTimeout(() => {
        server.close();
        bootstrap();
      }, 2000);
    } else {
      throw err;
    }
  });

  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}
bootstrap();
