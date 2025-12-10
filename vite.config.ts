
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Makes asset paths relative so they work in the /VOGE-2/ subdirectory
  build: {
    outDir: 'dist',
  }
});
