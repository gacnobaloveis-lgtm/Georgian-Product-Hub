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
