import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  return (
    <div className="flex min-h-screen bg-background px-4 font-mono text-sm">
      <div className="max-w-4xl w-full mx-auto my-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-destructive mb-2">Application Error</h1>
          <p className="text-muted-foreground">Something went wrong. Please report this error.</p>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6 overflow-x-auto">
          <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Error Message</span>
          </div>
          <div className="text-destructive font-medium break-all">
            {error.message || "No message"}
          </div>
        </div>

        {error.stack && (
          <div className="rounded-lg border border-border bg-card p-4 mb-6 overflow-x-auto">
            <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
              <span>Stack Trace</span>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all max-h-96 overflow-auto">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              reset();
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reload Page
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3m-6 0l2 2"
              />
            </svg>
            Go Home
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
          <p className="mb-2">Environment: {import.meta.env.MODE || "development"}</p>
          <p>Timestamp: {new Date().toISOString()}</p>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FlowForge Crypto" },
      {
        name: "description",
        content:
          "A visual node-based editor for composing and executing cryptographic data processing pipelines.",
      },
      { property: "og:title", content: "FlowForge Crypto" },
      {
        property: "og:description",
        content:
          "A visual node-based editor for composing and executing cryptographic data processing pipelines.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "FlowForge Crypto" },
      {
        name: "twitter:description",
        content:
          "A visual node-based editor for composing and executing cryptographic data processing pipelines.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { ThemeProvider } from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <ThemeProvider defaultTheme="system" storageKey="flowforge-crypto-theme">
      <QueryClientProvider client={queryClient}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
