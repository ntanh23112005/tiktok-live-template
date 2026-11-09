import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.js';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, 'output', 'qa-v2', 'data');
fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(path.join(dataDir, 'config.json'))) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'config.json'), 'utf8'));
  config.username = ''; config.musicFile = 'music.mp3'; config.musicVolume = .1;
  fs.writeFileSync(path.join(dataDir, 'config.json'), JSON.stringify(config, null, 2));
}
const app = createApp({ dataDir });
app.engine.showHallDemo();
app.server.listen(3001, '127.0.0.1', () => console.log('Isolated V2 QA: http://127.0.0.1:3001/admin'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().finally(() => process.exit(0)));
