import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'models');
const BASE =
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

await mkdir(OUT_DIR, { recursive: true });

const manifestPath = join(OUT_DIR, FILES[0]);
try {
  await access(manifestPath, constants.F_OK);
  console.log('Face models already present, skip download.');
  process.exit(0);
} catch {
  // download below
}

for (const file of FILES) {
  const url = `${BASE}/${file}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed ${file}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(OUT_DIR, file), buf);
  console.log(`OK ${file} (${buf.length} bytes)`);
}

console.log(`\nModels saved to ${OUT_DIR}`);
