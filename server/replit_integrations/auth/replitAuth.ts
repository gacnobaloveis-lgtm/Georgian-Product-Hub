import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import FacebookStrategy from "passport-facebook";
import GoogleStrategy from "passport-google-oauth20";

import passport from "passport";
import session from "express-session";
import crypto from "crypto";
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
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
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
      const userSub = user?.claims?.sub ? String(user.claims.sub) : "";
      const isExternalUser = userSub.startsWith("fb_") || userSub.startsWith("g_");

      req.logout(() => {
        if (isExternalUser) {
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
    const googleClientId = process.env.AUTH_GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.AUTH_GOOGLE_CLIENT_SECRET;

    if (googleClientId && googleClientSecret) {
      const getGoogleCallbackUrl = (req: any) => {
        const base = process.env.APP_URL || `https://${req.hostname}`;
        return `${base}/api/callback`;
      };

      const googleStrategies = new Map<string, string>();
      const ensureGoogleStrategy = (req: any) => {
        const callbackURL = getGoogleCallbackUrl(req);
        if (!googleStrategies.has(callbackURL)) {
          const strategyName = `google:${callbackURL}`;
          passport.use(
            strategyName,
            new GoogleStrategy.Strategy(
              {
                clientID: googleClientId,
                clientSecret: googleClientSecret,
                callbackURL,
                passReqToCallback: true as any,
              },
              async (req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
                try {
                  const googleId = `g_${profile.id}`;
                  const email = profile.emails?.[0]?.value || null;
                  const firstName = profile.name?.givenName || null;
                  const lastName = profile.name?.familyName || null;
                  const profileImageUrl = profile.photos?.[0]?.value || null;

                  await authStorage.upsertUser({
                    id: googleId,
                    email,
                    firstName,
                    lastName,
                    profileImageUrl,
                  });

                  const sessionUser: any = {};
                  sessionUser.claims = { sub: googleId };
                  sessionUser.expires_at = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
                  done(null, sessionUser);
                } catch (err) {
                  done(err);
                }
              }
            )
          );
          googleStrategies.set(callbackURL, strategyName);
        }
        return googleStrategies.get(callbackURL)!;
      };

      app.get("/api/login", (req, res, next) => {
        const returnTo = req.query.returnTo;
        if (returnTo && typeof returnTo === "string" && returnTo.startsWith("/")) {
          (req as any).session.returnTo = returnTo;
        }
        const strategyName = ensureGoogleStrategy(req);
        passport.authenticate(strategyName, {
          scope: ["profile", "email"],
        })(req, res, next);
      });

      app.get("/api/callback", (req, res, next) => {
        const returnTo = (req as any).session?.returnTo || "/";
        const strategyName = ensureGoogleStrategy(req);
        passport.authenticate(strategyName, {
          successRedirect: returnTo,
          failureRedirect: "/",
        })(req, res, next);
      });

      app.get("/api/logout", (req, res) => {
        req.logout(() => res.redirect("/"));
      });
    } else {
      app.get("/api/login", (_req, res) => res.redirect("/"));
      app.get("/api/callback", (_req, res) => res.redirect("/"));
      app.get("/api/logout", (req, res) => {
        req.logout(() => res.redirect("/"));
      });
    }
  }

  const fbAppId = process.env.AUTH_FACEBOOK_ID;
  const fbAppSecret = process.env.AUTH_FACEBOOK_SECRET;
  console.log(`[auth] Facebook config: ID=${fbAppId ? "SET" : "NOT SET"}, Secret=${fbAppSecret ? "SET" : "NOT SET"}`);

  const getFbCallbackUrl = (req: any) => {
    const base = process.env.APP_URL || `https://${req.hostname}`;
    const url = `${base}/api/callback/facebook`;
    console.log(`[auth] Facebook callback URL: ${url}`);
    return url;
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
    console.log("[auth] Facebook OAuth NOT configured - missing AUTH_FACEBOOK_ID or AUTH_FACEBOOK_SECRET");
    app.get("/api/login/facebook", (_req, res) => {
      res.status(500).json({ message: "Facebook OAuth is not configured. Set AUTH_FACEBOOK_ID and AUTH_FACEBOOK_SECRET." });
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sub = String(user.claims.sub);
  if (sub.startsWith("fb_") || sub.startsWith("g_")) {
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
