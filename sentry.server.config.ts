// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Server-specific options
  integrations: [
    Sentry.extraErrorDataIntegration({ depth: 10 }),
  ],

  // Capture unhandled promise rejections
  onUnhandledRejection: "strict",

  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }

    // Filter out known non-errors
    const error = hint.originalException;
    if (error && typeof error === "object" && "message" in error) {
      const message = error.message as string;
      if (message?.includes("ResizeObserver")) {
        return null;
      }
    }

    return event;
  },
});