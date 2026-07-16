use keyring::Entry;

const KEYRING_SERVICE: &str = "hermes-feeds";
const ALLOWED_GATEWAYS: &[&str] = &["signals", "security", "discord"];

/// Validates that the gateway is in the allowed list.
/// This is factored out so tests can verify it without hitting the real keyring.
fn validate_gateway(gateway: &str) -> Result<(), String> {
    if ALLOWED_GATEWAYS.contains(&gateway) {
        Ok(())
    } else {
        Err(format!(
            "unknown gateway '{}'. allowed: {}",
            gateway,
            ALLOWED_GATEWAYS.join(", ")
        ))
    }
}

/// Retrieve a feed token from the OS keychain for the given gateway.
/// Returns Err with a clear message if the gateway is unknown or the entry is missing.
#[tauri::command]
pub fn get_feed_token(gateway: String) -> Result<String, String> {
    validate_gateway(&gateway)?;

    let entry = Entry::new(KEYRING_SERVICE, &gateway)
        .map_err(|e| format!("failed to access keyring: {}", e))?;

    entry
        .get_password()
        .map_err(|e| format!("missing or inaccessible token for '{}': {}", gateway, e))
}

/// Store a feed token in the OS keychain for the given gateway.
/// Returns Err with a clear message if the gateway is unknown or the token is empty.
#[tauri::command]
pub fn set_feed_token(gateway: String, token: String) -> Result<(), String> {
    validate_gateway(&gateway)?;

    if token.is_empty() {
        return Err("token cannot be empty".to_string());
    }

    let entry = Entry::new(KEYRING_SERVICE, &gateway)
        .map_err(|e| format!("failed to access keyring: {}", e))?;

    entry
        .set_password(&token)
        .map_err(|e| format!("failed to store token for '{}': {}", gateway, e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_gateway_accepts_signals() {
        assert!(validate_gateway("signals").is_ok());
    }

    #[test]
    fn test_validate_gateway_accepts_security() {
        assert!(validate_gateway("security").is_ok());
    }

    #[test]
    fn test_validate_gateway_accepts_discord() {
        assert!(validate_gateway("discord").is_ok());
    }

    #[test]
    fn test_validate_gateway_rejects_unknown() {
        let result = validate_gateway("evil");
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("unknown gateway"));
    }

    #[test]
    fn test_validate_gateway_rejects_empty_string() {
        let result = validate_gateway("");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_gateway_rejects_case_mismatch() {
        let result = validate_gateway("Signals");
        assert!(result.is_err());
    }
}
