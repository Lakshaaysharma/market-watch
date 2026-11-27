import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { loadConfig } from './config/app-config';
import { createApp } from './create-app';

async function bootstrap(): Promise<void> {
  const { host, port } = loadConfig();
  const app = await createApp();
  await app.listen(port, host);
  new Logger('Bootstrap').log(`Listening on ${await app.getUrl()}`);
}

void bootstrap();
