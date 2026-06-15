# Security Policy

We take the security of EmberChamber's secure state core, client-side encryption caches, and routing relay seriously. If you believe you have found a security vulnerability, please report it to us using the responsible disclosure instructions below.

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues. Instead, email reports to:

**support@emberchamber.com**

Please include:
- A clear description of the vulnerability and its potential impact.
- Detailed step-by-step instructions or a proof-of-concept (PoC) script to reproduce the issue.
- The specific platform (Web companion, Android client, Windows, or Ubuntu desktop shell) and version affected.

We will review your submission and coordinate a response timeframe.

## Scope

### In Scope
- Client-side cryptographic failures in message decryption or group epoch state transitions.
- Unauthorized access to other users' mailbox ciphertext envelopes on the hosted relay.
- Remote code execution or sandbox escapes in Tauri desktop shells or Android APKs.
- Local cache database decryption bypasses.

### Out of Scope
- Denial of Service (DoS/DDoS) attacks against the hosted edge relay.
- Spamming or sending unsolicited invitations to test endpoints.
- Social engineering or phishing of EmberChamber users or developers.
- Accessing or modifying data belonging to other active accounts without authorization.

## Beta Status and Disclosure

EmberChamber is in an active beta testing phase. We do not currently operate a financial bug bounty program, but we will credit contributing researchers in our release changelog and repository commit history.

For more details on our trust model and platform security, see the [Security & Responsible Disclosure Page](https://emberchamber.com/security) and the [Trust & Safety Model](https://emberchamber.com/trust-and-safety).
