import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://adiparamkusam.com",
  base: "/",
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
