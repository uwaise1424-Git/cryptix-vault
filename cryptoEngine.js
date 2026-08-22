// cryptoEngine.js - Core Cryptography Module for Cryptix Vault

// ==========================================
// ZERO-KNOWLEDGE CRYPTOGRAPHY (AES-GCM)
// ==========================================

/**
 * Derives a secure AES-256 key from a plain text passphrase using PBKDF2
 */
async function getCryptoKey(passphrase, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000, // High iteration count to prevent brute-force attacks
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a file buffer for upload
 */
async function encryptFileBuffer(fileBuffer, passphrase) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const key = await getCryptoKey(passphrase, salt);

    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        fileBuffer
    );

    const encryptedBytes = new Uint8Array(encryptedContent);
    const payload = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
    
    payload.set(salt, 0);
    payload.set(iv, salt.length);
    payload.set(encryptedBytes, salt.length + iv.length);

    return payload;
}

/**
 * Decrypts a downloaded file buffer back into its original form
 */
async function decryptFileBuffer(encryptedBuffer, passphrase) {
    const payload = new Uint8Array(encryptedBuffer);
    
    const salt = payload.slice(0, 16);
    const iv = payload.slice(16, 28);
    const ciphertext = payload.slice(28);

    const key = await getCryptoKey(passphrase, salt);

    const decryptedContent = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );

    return decryptedContent;
}