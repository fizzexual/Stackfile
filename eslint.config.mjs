import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * Next.js 16 ships native flat configs, so we import and spread them
 * directly (no FlatCompat bridge required).
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "storage-data/**",
    ],
  },
];

export default eslintConfig;
