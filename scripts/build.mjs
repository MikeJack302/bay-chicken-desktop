import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/pet.js', 'src/panel.js'], bundle: true, format: 'iife', outdir: 'dist', minify: true, target: 'chrome140', loader: { '.glb': 'binary' } });
for (const file of ['pet.html', 'panel.html', 'style.css']) await copyFile('src/' + file, 'dist/' + file);
console.log('Built desktop companion.');
