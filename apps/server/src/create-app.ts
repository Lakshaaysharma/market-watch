import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { AppModule } from './app.module';
import { MAX_MESSAGE_BYTES, toNestEvent } from './gateway/message-parser';

/** Builds the application. Shared by `main.ts` and the end-to-end tests. */
export async function createApp(options: { logger?: false } = {}): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, options);
  app.useWebSocketAdapter(new WsAdapter(app, { messageParser: toNestEvent, maxPayload: MAX_MESSAGE_BYTES }));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.set('x-powered-by', false);

  // In production the server also hosts the built front end.
  const webDist = resolve(__dirname, '../../web/dist');
  if (existsSync(webDist)) {
    app.useStaticAssets(webDist, {
      // Asset file names contain a content hash, so browsers may keep them forever.
      setHeaders: (response, path) => {
        if (path.includes(`${sep}assets${sep}`)) response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    });
  }

  return app;
}
