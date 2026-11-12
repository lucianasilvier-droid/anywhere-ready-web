// Drizzle client on standard PostgreSQL (node-postgres), for scripts and typed
// queries. The app's runtime data layer uses the same pool (src/lib/db.server.js).
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle({ client: pool, schema });
