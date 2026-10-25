import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'netlify/**/*.test.ts'] },
  // pdfmake e as fontes são carregados sob demanda (só ao baixar um PDF).
  build: { chunkSizeWarningLimit: 1500 },
});
