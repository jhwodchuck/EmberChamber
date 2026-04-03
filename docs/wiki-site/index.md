---
layout: home
hero:
  name: EmberChamber
  text: Invite-only encrypted messaging for trusted circles.
  tagline: Adults-only · Invite-gated · Local-first · Private by design.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Architecture
      link: /architecture
features:
  - icon: 🔒
    title: End-to-End Encrypted DMs
    details: Direct messages are delivered through a device-bound ciphertext mailbox. The relay never sees plaintext message content.
  - icon: 👥
    title: Private Small Groups
    details: Groups are invite-only and capped at 12 members. Organizer or admin approval is required to bring anyone in during Phase 1.
  - icon: 🌐
    title: Relay-First Architecture
    details: A minimal Cloudflare Workers relay handles auth, group routing, and attachment ticketing. Clients own their history.
  - icon: 📱
    title: Android, Desktop & Web
    details: Android is the primary mobile surface. Windows and Ubuntu desktop ship via Tauri. Web is a capable secondary client.
  - icon: 🔑
    title: Email Magic-Link Auth
    details: Email is used only for authentication and recovery — never as the social identity. Passkey enrollment comes later.
  - icon: 🛡️
    title: Invite-Only Beta
    details: Every account requires a valid beta invite or a qualifying group invite. No public sign-up, no phone-number discovery.
---
