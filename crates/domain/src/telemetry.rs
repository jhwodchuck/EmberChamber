/// Initialise structured JSON logging and OpenTelemetry tracing.
///
/// Call this at the top of `main()` in every service. The `RUST_LOG`
/// environment variable controls the log filter (default: `info`).
pub fn init_tracing(service_name: &'static str) {
    use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(filter)
        .with(
            fmt::layer()
                .json()
                .with_current_span(true)
                .with_span_list(false),
        )
        .init();

    tracing::info!(service = service_name, "tracing initialised");
}
