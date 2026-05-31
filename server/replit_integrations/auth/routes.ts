import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/methods", (_req, res) => {
    res.json({
      google: !!(process.env.REPL_ID || process.env.AUTH_GOOGLE_CLIENT_ID),
      facebook: !!(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET),
    });
  });

  // The Facebook App ID is public (it appears in share/login URLs). Exposing it
  // lets the frontend open the full Facebook Share Dialog, which offers an
  // audience picker (own timeline, a group, a page you manage, Messenger, …)
  // instead of the plain sharer that only posts to your own timeline.
  // Public Facebook App ID. Falls back to the registered app id so the Share
  // Dialog works even on hosts where AUTH_FACEBOOK_ID is not set as an env var.
  app.get("/api/facebook/app-id", (_req, res) => {
    res.json({ appId: process.env.AUTH_FACEBOOK_ID || "2388960611602139" });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (user) {
        const { passwordHash, ...safeUser } = user as any;
        res.json(safeUser);
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
