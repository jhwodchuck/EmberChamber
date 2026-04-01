use uuid::Uuid;

/// Return a deterministic UUID for use in tests.
pub fn test_uuid(index: u8) -> Uuid {
    Uuid::from_bytes([index; 16])
}
