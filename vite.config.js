import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  server: {
    host: "0.0.0.0", // 모바일에서도 접근 가능
    port: 3000,
  },
});
