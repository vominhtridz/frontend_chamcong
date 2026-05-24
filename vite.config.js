import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Mở mạng LAN (0.0.0.0) — điện thoại truy cập qua http://<IP-PC>:3000
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://backend-chamcong.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
