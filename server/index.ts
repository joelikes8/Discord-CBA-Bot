import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger } from "./bot/utils/logger";
import { initializeRobloxService } from "./bot/services/roblox";

// Set a mock Discord token for development if not provided
if (!process.env.DISCORD_TOKEN) {
  if (process.env.NODE_ENV !== 'production') {
    logger.warn("Using mock DISCORD_TOKEN for development. Replace with your own token in production.");
    process.env.DISCORD_TOKEN = 'mock_token_for_development';
  } else {
    logger.error("DISCORD_TOKEN environment variable is required");
    process.exit(1);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Roblox integration
  await initializeRobloxService();
  
  // Initialize the Discord bot with the token from environment variables
  try {
    import('./bot').then(({ initializeBot }) => {
      initializeBot().then(() => {
        logger.info('Discord bot initialized successfully');
      }).catch(err => {
        logger.warn('Failed to initialize Discord bot:', err);
        logger.info('The bot will not be active - provide a valid DISCORD_TOKEN to enable it');
      });
    }).catch(err => {
      logger.warn('Failed to import bot module:', err);
    });
  } catch (error) {
    logger.warn('Error initializing bot:', error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error(`Error: ${message}`, err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`Server listening on port ${port}`);
  });
})();
