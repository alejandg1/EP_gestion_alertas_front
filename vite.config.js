import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vue()],
    envPrefix: ['VITE_', 'CAMERAS_'],
    define: {
      'process.env.CAMERAS_API': JSON.stringify(env.CAMERAS_API || env.VITE_CAMERAS_API || '')
    },
    server: {
      watch: {
        ignored: ['**/public/plugins/**', '**/*.exe', '**/node_modules/**']
      }
    }
  };
});
