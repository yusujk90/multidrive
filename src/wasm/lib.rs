use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use aes_gcm::{
    aead::{Aead, KeyInit, generic_array::GenericArray},
    Aes256Gcm, Nonce
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::RngCore;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct EncryptedPayload {
    pub ciphertext_b64: String,
    pub nonce_hex: String,
    pub sha256_checksum: String,
}

#[derive(Serialize, Deserialize)]
pub struct FileHashResult {
    pub sha256_hex: String,
    pub bytes_processed: usize,
    pub duration_estimate_ms: f64,
}

/// Compute SHA-256 hash of a byte slice with native WASM execution speed
#[wasm_bindgen]
pub fn compute_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    hex::encode(result)
}

/// Verify if data matches expected SHA-256 hash
#[wasm_bindgen]
pub fn verify_sha256(data: &[u8], expected_hash: &str) -> bool {
    let actual_hash = compute_sha256(data);
    actual_hash.eq_ignore_ascii_case(expected_hash)
}

/// Encrypt raw file data using AES-256-GCM with 96-bit random nonce
#[wasm_bindgen]
pub fn encrypt_aes256_gcm(data: &[u8], key_32_bytes: &[u8]) -> Result<JsValue, JsValue> {
    if key_32_bytes.len() != 32 {
        return Err(JsValue::from_str("Key must be exactly 32 bytes (256 bits)"));
    }

    let key = GenericArray::from_slice(key_32_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|e| JsValue::from_str(&format!("Encryption failed: {:?}", e)))?;

    let checksum = compute_sha256(data);

    let payload = EncryptedPayload {
        ciphertext_b64: BASE64.encode(&ciphertext),
        nonce_hex: hex::encode(nonce_bytes),
        sha256_checksum: checksum,
    };

    serde_wasm_bindgen::to_value(&payload)
        .map_err(|e| JsValue::from_str(&format!("Serialization failed: {:?}", e)))
}

/// Decrypt AES-256-GCM ciphertext payload
#[wasm_bindgen]
pub fn decrypt_aes256_gcm(
    ciphertext_b64: &str,
    nonce_hex: &str,
    key_32_bytes: &[u8]
) -> Result<Vec<u8>, JsValue> {
    if key_32_bytes.len() != 32 {
        return Err(JsValue::from_str("Key must be exactly 32 bytes (256 bits)"));
    }

    let ciphertext = BASE64
        .decode(ciphertext_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 ciphertext: {:?}", e)))?;

    let nonce_bytes = hex::decode(nonce_hex)
        .map_err(|e| JsValue::from_str(&format!("Invalid nonce hex: {:?}", e)))?;

    if nonce_bytes.len() != 12 {
        return Err(JsValue::from_str("Nonce must be exactly 12 bytes (96 bits)"));
    }

    let key = GenericArray::from_slice(key_32_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| JsValue::from_str(&format!("Decryption authentication failed: {:?}", e)))?;

    Ok(plaintext)
}
