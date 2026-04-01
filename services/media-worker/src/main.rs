use emberchamber_domain::telemetry::init_tracing;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    init_tracing("media-worker");
    tracing::info!("media-worker starting — Sprint 2 will wire upload finalization and malware scan");
}
