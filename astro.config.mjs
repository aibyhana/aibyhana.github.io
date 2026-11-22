import { defineConfig } from "astro/config";

// The site is built into plain files and served by GitHub Pages at this address.
export default defineConfig({
  site: "https://aibyhana.github.io",
  // the pages are written out as they are: no space between two words may go missing
  compressHTML: false
});
