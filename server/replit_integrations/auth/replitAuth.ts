import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import FacebookStrategy from "passport-facebook";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    const replId = process.env.REPL_ID;
    if (!replId) {
      return null;
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      replId
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: null,
    lastName: null,
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  if (config) {
    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    const registeredStrategies = new Set<string>();

    const ensureStrategy = (domain: string) => {
      const strategyName = `replitauth:${domain}`;
      if (!registeredStrategies.has(strategyName)) {
        const strategy = new Strategy(
          {
            name: strategyName,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
          },
          verify
        );
        passport.use(strategy);
        registeredStrategies.add(strategyName);
      }
    };

    app.get("/api/login", (req, res, next) => {
      const returnTo = req.query.returnTo;
      if (returnTo && typeof returnTo === "string" && returnTo.startsWith("/")) {
        (req as any).session.returnTo = returnTo;
      }
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      ensureStrategy(req.hostname);
      const returnTo = (req as any).session?.returnTo || "/";
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: returnTo,
        failureRedirect: "/api/login",
      })(req, res, next);
    });

    app.get("/api/logout", (req, res) => {
      const user = req.user as any;
      const isFacebookUser = user?.claims?.sub && String(user.claims.sub).startsWith("fb_");

      req.logout(() => {
        if (isFacebookUser) {
          res.redirect("/");
        } else {
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        }
      });
    });
  } else {
    app.get("/api/login", (_req, res) => res.redirect("/"));
    app.get("/api/callback", (_req, res) => res.redirect("/"));
    app.get("/api/logout", (req, res) => {
      req.logout(() => res.redirect("/"));
    });
  }

  const fbAppId = process.env.AUTH_FACEBOOK_ID;
  const fbAppSecret = process.env.AUTH_FACEBOOK_SECRET;

  const getFbCallbackUrl = (req: any) => {
    return `https://${req.hostname}/api/callback/facebook`;
  };

  if (fbAppId && fbAppSecret) {
    const registerFbStrategy = (callbackURL: string) => {
      const strategyName = `facebook:${callbackURL}`;
      passport.use(
        strategyName,
        new FacebookStrategy.Strategy(
          {
            clientID: fbAppId,
            clientSecret: fbAppSecret,
            callbackURL,
            profileFields: ["id", "emails", "name", "picture.type(large)"],
            passReqToCallback: true as any,
          },
          async (req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
              const fbId = `fb_${profile.id}`;
              const email = profile.emails?.[0]?.value || null;
              const firstName = profile.name?.givenName || null;
              const lastName = profile.name?.familyName || null;
              const profileImageUrl = profile.photos?.[0]?.value || null;

              await authStorage.upsertUser({
                id: fbId,
                email,
                firstName,
                lastName,
                profileImageUrl,
              });

              const sessionUser: any = {};
              sessionUser.claims = { sub: fbId };
              sessionUser.expires_at = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
              done(null, sessionUser);
            } catch (err) {
              done(err);
            }
          }
        )
      );
      return strategyName;
    };

    const fbStrategies = new Map<string, string>();
    const ensureFbStrategy = (req: any) => {
      const callbackURL = getFbCallbackUrl(req);
      if (!fbStrategies.has(callbackURL)) {
        const name = registerFbStrategy(callbackURL);
        fbStrategies.set(callbackURL, name);
      }
      return fbStrategies.get(callbackURL)!;
    };

    app.get("/api/login/facebook", (req, res, next) => {
      const returnTo = req.query.returnTo;
      if (returnTo && typeof returnTo === "string" && returnTo.startsWith("/")) {
        (req as any).session.returnTo = returnTo;
      }
      const strategyName = ensureFbStrategy(req);
      passport.authenticate(strategyName, {
        scope: ["email"],
      })(req, res, next);
    });

    app.get("/api/callback/facebook", (req, res, next) => {
      const returnTo = (req as any).session?.returnTo || "/";
      const strategyName = ensureFbStrategy(req);
      passport.authenticate(strategyName, {
        successRedirect: returnTo,
        failureRedirect: "/",
      })(req, res, next);
    });
  } else {
    app.get("/api/login/facebook", (_req, res) => {
      res.redirect("/");
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (String(user.claims.sub).startsWith("fb_")) {
    const now = Math.floor(Date.now() / 1000);
    if (user.expires_at && now > user.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return next();
  }

  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    if (!config) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
