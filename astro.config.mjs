import { defineConfig } from "astro/config";

// The site is built into plain files and served by GitHub Pages at this address.
export default defineConfig({
  // Reading is part of the second brain now. Its old address leads there.
  redirects: { "/reading": "/brain/" },
  site: "https://aibyhana.github.io",
  // the pages are written out as they are: no space between two words may go missing
  compressHTML: false
});
