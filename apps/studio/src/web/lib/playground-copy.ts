import type { ExecuteStatusResponse } from "@/shared/api";

/**
 * The line under the Playground title. Execute is opt-in, so it mentions running SQL only when it is on and has a
 * connection; while the status loads, failed to load, or has no connection, it doesn't.
 */
export function playgroundSubtitle(status: Pick<ExecuteStatusResponse, "enabled" | "configured"> | null | undefined): string {
  return status?.enabled && status.configured
    ? "Generate SQL from natural language, and run it through the connection you configured"
    : "Generate SQL from natural language";
}

/** The review advice after the sensitive-column warning, worded as `askdb ask` words it. */
export const SENSITIVE_REVIEW_ADVICE = "Review carefully before sharing or running this SQL.";
