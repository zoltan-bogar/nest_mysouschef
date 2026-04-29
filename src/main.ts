import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true, bodyParser: false });
  app.use(require('express').json({
    limit: '10mb',
    verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; },
  }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));
  await app.listen(3001);
}
bootstrap();
