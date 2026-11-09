import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em dev, "/api/..." é repassado para a API Hono na porta 3000 (evita erro de CORS).
// 127.0.0.1 em vez de "localhost": no Windows o "localhost" às vezes vira o endereço IPv6 (::1)
// e a conexão falha sem motivo aparente. O número fixo nunca tem essa dúvida.
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3000',
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // host: true = aceita conexões da rede (celular no mesmo Wi-Fi), não só do próprio PC.
    // O endereço para o celular aparece no terminal, na linha "Network".
    host: true,
    port: 5173,
    // Se a 5173 estiver ocupada, avisa em vez de trocar de porta em silêncio
    // (senão o endereço salvo no celular para de funcionar sem você perceber)
    strictPort: true,
    proxy: apiProxy,
  },
  // O mesmo para o "bun run preview" (testar a versão de produção antes de publicar)
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    proxy: apiProxy,
  },
})
