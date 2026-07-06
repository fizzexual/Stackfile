import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./index";

/**
 * Request-deduped server-side session lookup. Safe to call from multiple
 * server components in the same render.
 */
export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
