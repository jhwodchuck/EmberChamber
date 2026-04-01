use anyhow::Context;
use sqlx::PgPool;

/// Create and return a Postgres connection pool.
///
/// Reads the `DATABASE_URL` environment variable.
pub async fn connect() -> anyhow::Result<PgPool> {
    let url = std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;
    let pool = PgPool::connect(&url)
        .await
        .context("failed to connect to Postgres")?;
    Ok(pool)
}
