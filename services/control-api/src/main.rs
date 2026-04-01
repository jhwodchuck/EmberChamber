use privatemesh_domain::telemetry::init_tracing;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    init_tracing("control-api");
    tracing::info!("control-api starting — Sprint 1 will wire auth, sessions, and profile routes");
}
