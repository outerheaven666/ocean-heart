import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../server/src/trpc/router";

export const TOKEN_KEY = "ocean-heart-token";

// 默认走同源 /trpc(本地 dev 代理或后端托管);GitHub Pages 静态部署时在构建期注入 VITE_API_URL 指向公网后端
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "/trpc";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      headers() {
        const token = getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
