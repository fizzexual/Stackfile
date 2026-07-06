import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { accounts, sessions, users, verifications } from "@/lib/db/schema";

export const auth = betterAuth({
  appName: "Stackfile",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  user: {
    additionalFields: {
      role: { type: "string", required: false, input: false },
      storageQuota: { type: "number", required: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh if older than 1 day
  },
  databaseHooks: {
    user: {
      create: {
        // The very first registered user becomes the instance admin.
        before: async (user) => {
          const total = await db.$count(users);
          return { data: { ...user, role: total === 0 ? "admin" : "user" } };
        },
      },
    },
  },
  // nextCookies() must be the last plugin.
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
