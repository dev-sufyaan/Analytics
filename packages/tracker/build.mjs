import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
  const distDir = path.resolve(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'src/t.ts')],
    bundle: true,
    minify: true,
    target: ['es2018'],
    format: 'iife',
    outfile: path.resolve(distDir, 't.js'),
    write: true,
  });

  const content = fs.readFileSync(path.resolve(distDir, 't.js'));
  const gzipped = zlib.gzipSync(content);

  console.log(`t.js size: ${content.length} bytes (raw), ${gzipped.length} bytes (gzip)`);
  if (gzipped.length > 1536) {
    console.warn(`WARNING: Gzip size (${gzipped.length} B) exceeds 1.5 KB budget!`);
  } else {
    console.log(`✓ Gzip size under 1.5 KB budget! (${gzipped.length} / 1536 bytes)`);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
