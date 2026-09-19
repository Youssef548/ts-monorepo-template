import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { ErrorEnvelopeFilter } from './filters/error-envelope.filter';
import { validateEnv } from './config/env';

async function bootstrap() {
  // Validate before anything else, so a bad deploy fails at boot with a list of
  // what is wrong rather than deep inside the first request.
  const env = validateEnv();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // Every request body/query/param that uses a contract schema is validated
  // here, before a handler runs.
  app.useGlobalPipes(new ZodValidationPipe());
  // Every uncaught failure leaves through here, in one shape.
  app.useGlobalFilters(new ErrorEnvelopeFilter());
  app.enableCors({ origin: env.WEB_URL.split(','), credentials: true });

  // Documentation only. Nothing reads this at build time — there is no
  // generated client, and the contract lives in packages/contracts.
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle(`${env.APP_NAME} API`)
        .setVersion('0.1.0')
        .addBearerAuth()
        .build(),
    ),
  );
  SwaggerModule.setup('docs', app, document);

  await app.listen(env.PORT);
}
void bootstrap();
