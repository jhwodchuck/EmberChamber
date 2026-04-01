import fs from "fs";
import path from "path";
import pool from "./client";

const migrationsDir = path.join(__dirname, "migrations");

async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(64) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations ORDER BY version"
    );
    const appliedVersions = new Set(applied.map((r) => r.version));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const version = file.replace(".sql", "");
      if (appliedVersions.has(version)) {
        console.log(`  ✓ ${version} (already applied)`);
        continue;
      }

      console.log(`  → Applying ${version}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING",
          [version]
        );
        await client.query("COMMIT");
        console.log(`  ✓ ${version} applied`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("Migrations complete.");
  } finally {
    client.release();
  }
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
