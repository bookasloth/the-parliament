"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

// Catches errors in the root layout / React render that the route-group error.tsx
// can't reach. Reports to Sentry and shows a minimal branded fallback (this file
// replaces the whole document, so it renders its own <html>/<body>).
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f2ef",
          fontFamily: "system-ui, sans-serif",
          color: "#0f172a",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              background: "#009ae4",
              color: "#fff",
              padding: "0.625rem 1.25rem",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Back to home
          </a>
          {error.digest && (
            <p style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "1.5rem" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
