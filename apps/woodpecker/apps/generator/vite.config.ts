import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/woodpecker-generator/",
  plugins: [
    react(),
    {
      name: "suite-root-icons",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          return html.replace(
            /href="\/woodpecker-generator\/(favicon-32\.png|apple-touch-icon\.png)"/g,
            'href="/$1"',
          );
        },
      },
    },
  ],
  server: {
    allowedHosts: [".trycloudflare.com"],
  },
  preview: {
    allowedHosts: [".trycloudflare.com"],
  },
});
