/** The line under the Playground title. Execute is opt-in, so it mentions running SQL only when it is on. */
export function playgroundSubtitle(executeEnabled: boolean): string {
  return executeEnabled
    ? "Generate SQL from natural language, and run it through the connection you configured"
    : "Generate SQL from natural language";
}

/** The review advice after the sensitive-column warning, worded as `askdb ask` words it. */
export const SENSITIVE_REVIEW_ADVICE = "Review carefully before sharing or running this SQL.";
