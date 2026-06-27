import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://adi-param.github.io",
  base: "/adi-blog",
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
