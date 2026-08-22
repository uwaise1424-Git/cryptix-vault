// cryptoEngine.js - Core Cryptography & Auth Module for Cryptix Vault

// ==========================================
// 1. IDENTITY & ACCESS MANAGEMENT (COGNITO)
// ==========================================

// Initialize Cognito Pool
const poolData = {
    UserPoolId: 'YOUR_USER_POOL_ID', // <--- Paste your actual User Pool ID here
    ClientId: '6u8c7uhsr844uqc6bfqe4q0oab' 
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

/**
 * Registers a new user via Amazon Cognito
 */
function register() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email })
    ];

    userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
            alert(err.message || JSON.stringify(err));
            return;
        }
        alert('Success! Check your email for a verification code, or confirm the user manually in the AWS Console.');
    });
}

/**
 * Logs in a user and securely stores the JWT Token
 */
function login() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password,
    });
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool
    });

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function(result) {
            const jwtToken = result.getIdToken().getJwtToken();
            console.log("Vault Unlocked! JWT obtained.");
            
            // Store token for authenticating AWS backend requests
            localStorage.setItem('vaultToken', jwtToken);
            alert("Login Successful! You now have access to the vault.");
        },
        onFailure: function(err) {
            alert(err.message || JSON.stringify(err));
        },
    });
}

// ==========================================
// 2. ZERO-KNOWLEDGE CRYPTOGRAPHY (AES-GCM)
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