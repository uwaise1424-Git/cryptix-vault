# 🛡️ Cryptix — Zero-Trust Secure File Vault

**Cryptix** is a serverless, zero-knowledge cloud storage application designed for highly secure, ephemeral file sharing. Built as a Final Year Project, it demonstrates advanced cloud architecture and applied cryptography.

## 🚀 Architecture Overview
This project completely eliminates backend trust by encrypting files in the browser *before* they ever touch the network. The backend simply routes the ciphertext to cloud storage without ever having access to the cryptographic keys.

* **Frontend:** Vanilla HTML/JS, TailwindCSS (Hosted on AWS Amplify via GitHub CI/CD)
* **Backend:** AWS API Gateway, AWS Lambda (Python 3.x)
* **Storage:** Amazon S3 (with 24-hour lifecycle policies)

## ✨ Key Features
1. **Zero-Knowledge Encryption:** Utilizes `Web Crypto API` (AES-256-GCM) and PBKDF2 key derivation. The plaintext file and passphrase never leave the user's device.
2. **Serverless Pre-Signed URLs:** The AWS Lambda backend does not process the files directly. Instead, it generates secure, time-limited S3 Pre-signed URLs, allowing the browser to stream ciphertext directly to the bucket, bypassing API Gateway payload limits.
3. **Automated Data Lifecycle:** Implements an enterprise-grade AWS S3 Lifecycle Rule that automatically self-destructs (permanently deletes) all uploaded ciphertext after 24 hours to ensure zero data retention.
4. **CI/CD Pipeline:** The frontend is directly linked to this GitHub repository. Pushing to the `main` branch automatically triggers an AWS Amplify build and global deployment.

## ⚙️ How It Works
### 🔒 Uploading a File
1. The user selects a file and enters a passphrase.
2. A unique Salt and IV are generated locally.
3. The file is encrypted via AES-256-GCM. Salt, IV, and Ciphertext are bundled into a single binary payload.
4. The browser fetches a secure `PUT` URL from AWS Lambda.
5. The payload is uploaded directly to Amazon S3.

### 🔓 Downloading a File
1. The user enters the S3 Object Key and their original passphrase.
2. The browser fetches a secure `GET` URL from AWS Lambda.
3. The ciphertext payload is downloaded from Amazon S3.
4. The Salt and IV are extracted, the AES key is re-derived, and the file is decrypted locally.

## 📁 Repository Structure
* `/index.html` - The main user interface.
* `/cryptoEngine.js` - The core cryptography module handling AES-GCM and PBKDF2.
* `/backend/lambda_function.py` - The serverless Python backend handling S3 authorization.
