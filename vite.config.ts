import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build is a single self-contained HTML file (JS, CSS and the simulation
// worker inlined), so dist/index.html also works when opened via file://.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  // long simulations (60 days, many profiles) need more than the default 5 s on slower CI machines
  test: { environment: 'node', testTimeout: 120000 },
} as any);
