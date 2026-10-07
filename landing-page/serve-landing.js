// Simple static server for the yellow landing page.
// Run with: bun run landing-page/serve-landing.js
// Then open http://localhost:3434 in your browser.

import { serve } from "bun";

serve({
  port: 3434,
  fetch(req) {
    const url = new URL(req.url);
    let path = "./landing-page/index.html";

    if (url.pathname !== "/") {
      const p = `./landing-page${url.pathname}`;
      try {
        if (Bun.file(p).size > 0) path = p;
      } catch { /* keep default */ }
    }

    const ct = path.endsWith(".css") ? "text/css" : "text/html";
    const data = Bun.file(path);
    return new Response(data, {
      status: 200,
      headers: { "Content-Type": ct },
    });
  },
});

console.log("🟡 Landing page: http://localhost:3434");