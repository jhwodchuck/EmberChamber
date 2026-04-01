use privatemesh_domain::telemetry::init_tracing;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    init_tracing("realtime-gateway");
    tracing::info!("realtime-gateway starting — Sprint 2 will wire WebSocket fan-out");
}
