import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve real static assets first (JS, CSS, images, etc.)
  app.use(express.static(distPath));

  // Any /api/* path that reaches this point was not handled by the API
  // routes registered earlier — respond with a proper JSON 404 instead of
  // falling back to index.html (which would return HTML with a 200 status).
  app.use("/api/{*path}", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  // Health checks must never be masked by the SPA fallback. If this is
  // reached, the real /health handler (registered earlier in the app)
  // didn't match, so report it as unavailable rather than returning HTML.
  app.use("/health", (_req, res) => {
    res.status(404).json({ status: "unavailable" });
  });

  // For everything else, only fall back to index.html for GET requests that
  // look like SPA navigation (no file extension, i.e. not a missing static
  // asset). This avoids serving HTML for missing assets or creating
  // redirect loops when index.html itself references a missing file.
  app.use("/{*path}", (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return res.status(404).json({ message: "Not found" });
    }

    const hasFileExtension = path.extname(req.path) !== "";
    if (hasFileExtension) {
      return res.status(404).send("Not found");
    }

    res.status(200).sendFile(path.resolve(distPath, "index.html"), (err) => {
      if (err) {
        res.status(404).send("Not found");
      }
    });
  });
}
