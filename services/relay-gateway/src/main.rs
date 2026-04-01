use emberchamber_domain::telemetry::init_tracing;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    init_tracing("relay-gateway");
    tracing::info!("relay-gateway starting — Sprint 5 will wire inter-operator federation");
}
