import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/blind-chess/",
  publicDir: false,
  preview: {
    allowedHosts: [".trycloudflare.com"]
  },
  plugins: [
    react(),
    {
      name: "suite-root-icons",
      enforce: "post",
      transformIndexHtml(html) {
        return html
          .replaceAll('href="/blind-chess/favicon-32.png"', 'href="/favicon-32.png"')
          .replaceAll('href="/blind-chess/apple-touch-icon.png"', 'href="/apple-touch-icon.png"');
      }
    }
  ]
});
