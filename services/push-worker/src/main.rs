use privatemesh_domain::telemetry::init_tracing;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    init_tracing("push-worker");
    tracing::info!("push-worker starting — Sprint 2 will wire web push delivery");
}
