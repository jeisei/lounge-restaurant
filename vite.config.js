import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: { home: "index.html", menu: "menu.html" }
    }
  }
});
