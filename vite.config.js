import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
   plugins: [react()],
  server: {
    allowedHosts: ['ner-logix-2.onrender.com']
  }
});
