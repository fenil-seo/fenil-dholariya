import { neon } from "@neondatabase/serverless";

let sqlClient = null;

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/** Returns a callable usable both as a tagged template and as sql(text, params). */
export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}
