// Simple static file server for E2E tests
// Serves the src/ directory on port 1420, mimicking what Tauri dev does
import { join } from "path";

const ROOT = join(import.meta.dir, "../../src");

Bun.serve({
  port: 1420,
  async fetch(req) {
    let pathname = new URL(req.url).pathname;
    if (pathname === "/") pathname = "/index.html";

    const file = Bun.file(join(ROOT, pathname));
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not Found", { status: 404 });
  },
});
