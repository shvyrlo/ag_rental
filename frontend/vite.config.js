import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow any host (Railway proxy, local LAN IPs, custom domains).
    allowedHosts: true,
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
  // `vite preview` (used in production on Railway) blocks unknown hosts
  // by default. Allow any host so the app works behind Railway's proxy
  // and any future custom domains.
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
});
