use emberchamber_domain::telemetry::init_tracing;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    init_tracing("directory-ca");
    tracing::info!("directory-ca starting — Sprint 5 will wire username registry and operator CA");
}
