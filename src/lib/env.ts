import { z } from "zod";

/**
 * Typed, validated environment. Import `env` anywhere instead of touching
 * `process.env` directly. Validation runs once at module load.
 *
 * During Docker image builds (no runtime secrets yet) set SKIP_ENV_VALIDATION=1.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:4000"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis (optional until background jobs land)
  REDIS_URL: z.string().optional(),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.url().default("http://localhost:4000"),

  // Storage
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./storage-data"),
  STORAGE_MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5_368_709_120), // 5 GiB
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  if (process.env.SKIP_ENV_VALIDATION) {
    return process.env as unknown as Env;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    console.error(`\n❌ Invalid environment variables:\n${details}\n`);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env = loadEnv();
