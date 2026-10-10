import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site under /<repo>/
  base: command === 'build' ? '/trello-epic/' : '/',
  // Trello requires HTTPS for the iframe connector, even locally
  plugins: [basicSsl()],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        section: 'section.html',
      },
    },
  },
}));
