import { env } from "@/lib/env";

export type OAuthProvider = "github" | "google";

/** Which social providers have credentials configured on this instance. */
export function enabledOAuthProviders(): OAuthProvider[] {
  const list: OAuthProvider[] = [];
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) list.push("github");
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) list.push("google");
  return list;
}
