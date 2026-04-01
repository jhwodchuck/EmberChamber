use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ring::rand::{SecureRandom, SystemRandom};

/// An opaque, cryptographically random session token.
#[derive(Debug, Clone)]
pub struct SessionToken(String);

impl SessionToken {
    /// Generate a new 32-byte random session token encoded as base64url.
    pub fn generate() -> anyhow::Result<Self> {
        let rng = SystemRandom::new();
        let mut bytes = [0u8; 32];
        rng.fill(&mut bytes)
            .map_err(|_| anyhow::anyhow!("failed to generate random bytes"))?;
        Ok(Self(URL_SAFE_NO_PAD.encode(bytes)))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for SessionToken {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}
