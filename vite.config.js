import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/my-site/', // 注意：这里必须是你刚才在 GitHub 上创建的仓库名，前后都要有斜杠
})