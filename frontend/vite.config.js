import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Polling is required when running in Docker Desktop on macOS —
    // inotify doesn't work reliably across the osxfs / VirtioFS bridge.
    watch: {
      usePolling: true,
      interval: 300,
    },
    // HMR websocket needs to use the host-facing port when the browser
    // is outside Docker. Override with VITE_HMR_PORT if you change ports.
    hmr: {
      clientPort: Number(process.env.VITE_HMR_PORT || 5174),
    },
  },
});
