"""
EmberChamber – Manim animation: End-to-End Encrypted Messaging Flow
===================================================================

Scenes
------
1. TitleScene          – EmberChamber brand card
2. DeviceBundleScene   – NaCl key-pair creation (packages/protocol/src/e2ee.ts)
3. E2EEMessageScene    – Box encryption, CipherEnvelope, relay mailbox delivery
4. AttachmentScene     – Symmetric secretbox encryption for attachments
5. ArchitectureScene   – Full system: clients → relay → mailbox → recipient

Run
---
    manim -pqh tools/manim/emberchamber_e2ee.py EmberChamberVideo

Or render individual scenes, e.g.:
    manim -pql tools/manim/emberchamber_e2ee.py TitleScene
"""

from manim import (
    Scene,
    MovingCameraScene,
    Text,
    Tex,
    MathTex,
    VGroup,
    Rectangle,
    RoundedRectangle,
    Arrow,
    Line,
    Circle,
    Dot,
    Square,
    Polygon,
    FadeIn,
    FadeOut,
    Write,
    Create,
    Transform,
    ReplacementTransform,
    GrowArrow,
    AnimationGroup,
    Succession,
    LaggedStart,
    DrawBorderThenFill,
    Indicate,
    Flash,
    SurroundingRectangle,
    Brace,
    BraceLabel,
    UP,
    DOWN,
    LEFT,
    RIGHT,
    ORIGIN,
    UL,
    UR,
    DL,
    DR,
    DEGREES,
    PI,
    TAU,
    WHITE,
    BLACK,
    GRAY,
    LIGHT_GRAY,
    DARK_GRAY,
    RED,
    GREEN,
    BLUE,
    YELLOW,
    ORANGE,
    PURPLE,
    TEAL,
    GOLD,
    MAROON,
    config,
    rate_functions,
    smooth,
    there_and_back,
    ValueTracker,
    always_redraw,
    DecimalNumber,
    Integer,
    NumberPlane,
    CurvedArrow,
    ArcBetweenPoints,
    MoveToTarget,
    ApplyMethod,
    Wait,
    PINK,
)

# ── Brand palette ────────────────────────────────────────────────────────────
EMBER_ORANGE = "#E05C2A"
EMBER_DARK   = "#1A0F0A"
EMBER_CREAM  = "#F5EDE3"
EMBER_GRAY   = "#4A3728"
RELAY_BLUE   = "#2A6EE0"
KEY_GREEN    = "#2AE06E"
CIPHER_RED   = "#E02A6E"
PLAIN_TEAL   = "#2AE0C8"


# ── Helper: labelled box ─────────────────────────────────────────────────────
def _box(label: str, width: float = 2.6, height: float = 0.9,
         color: str = WHITE, label_color: str = WHITE,
         font_size: int = 22) -> VGroup:
    rect = RoundedRectangle(
        corner_radius=0.12,
        width=width,
        height=height,
        color=color,
        fill_color=EMBER_DARK,
        fill_opacity=0.85,
        stroke_width=2,
    )
    text = Text(label, color=label_color, font_size=font_size)
    text.move_to(rect.get_center())
    return VGroup(rect, text)


def _arrow(start_mob, end_mob, label: str = "", color: str = WHITE,
           buff: float = 0.15) -> VGroup:
    arr = Arrow(
        start_mob.get_right(),
        end_mob.get_left(),
        buff=buff,
        color=color,
        stroke_width=3,
        max_tip_length_to_length_ratio=0.15,
    )
    group: list = [arr]
    if label:
        lbl = Text(label, font_size=16, color=color)
        lbl.next_to(arr, UP, buff=0.08)
        group.append(lbl)
    return VGroup(*group)


# ════════════════════════════════════════════════════════════════════════════
# Scene 1 – Title Card
# ════════════════════════════════════════════════════════════════════════════
class TitleScene(Scene):
    def construct(self):
        self.camera.background_color = EMBER_DARK

        # Flame glyph (simple polygon approximation)
        flame = Polygon(
            [0, 1.0, 0], [0.45, 0.35, 0], [0.25, 0.5, 0],
            [0.55, -0.3, 0], [0, 0.1, 0], [-0.55, -0.3, 0],
            [-0.25, 0.5, 0], [-0.45, 0.35, 0],
            fill_color=EMBER_ORANGE, fill_opacity=1,
            stroke_width=0,
        ).scale(0.9).shift(UP * 1.5)

        title = Text("EmberChamber", font_size=58, color=EMBER_CREAM,
                     weight="BOLD")
        subtitle = Text(
            "End-to-End Encrypted Messaging",
            font_size=26,
            color=EMBER_ORANGE,
        )
        title.next_to(flame, DOWN, buff=0.35)
        subtitle.next_to(title, DOWN, buff=0.25)

        tagline = Text(
            "invite-only · local-first · adults-only",
            font_size=18,
            color=GRAY,
        ).next_to(subtitle, DOWN, buff=0.55)

        self.play(DrawBorderThenFill(flame, run_time=1.2))
        self.play(
            LaggedStart(
                Write(title, run_time=1.0),
                FadeIn(subtitle, shift=UP * 0.2, run_time=0.8),
                FadeIn(tagline, shift=UP * 0.1, run_time=0.8),
                lag_ratio=0.35,
            )
        )
        self.wait(2.5)
        self.play(FadeOut(VGroup(flame, title, subtitle, tagline)))


# ════════════════════════════════════════════════════════════════════════════
# Scene 2 – Device Bundle / Key-Pair Generation
# ════════════════════════════════════════════════════════════════════════════
class DeviceBundleScene(Scene):
    def construct(self):
        self.camera.background_color = EMBER_DARK

        heading = Text("Device Bundle – Key Pair Creation",
                       font_size=32, color=EMBER_CREAM)
        heading.to_edge(UP, buff=0.45)
        self.play(Write(heading))

        # Source code snippet (from packages/protocol/src/e2ee.ts)
        code_lines = [
            "// packages/protocol/src/e2ee.ts",
            "function createStoredDeviceBundle() {",
            "  const keyPair = nacl.box.keyPair();",
            "  const publicKeyB64  = encodeBytes(keyPair.publicKey);",
            "  const privateKeyB64 = encodeBytes(keyPair.secretKey);",
            "  return { identityKeyB64: publicKeyB64,",
            "           privateKeyB64, ... };",
            "}",
        ]
        code_block = VGroup(*[
            Text(line, font_size=17, color=PLAIN_TEAL,
                 font="Courier New")
            for line in code_lines
        ]).arrange(DOWN, aligned_edge=LEFT, buff=0.08)
        code_bg = SurroundingRectangle(
            code_block, color=EMBER_GRAY, fill_color="#150C08",
            fill_opacity=1, corner_radius=0.1, buff=0.22,
        )
        code_group = VGroup(code_bg, code_block)
        code_group.shift(LEFT * 2.8 + DOWN * 0.2)

        self.play(FadeIn(code_bg), LaggedStart(
            *[Write(l, run_time=0.25) for l in code_block],
            lag_ratio=0.12,
        ))
        self.wait(0.4)

        # Visualise the output bundle on the right
        sk_box = _box("Private Key\n(secretKey)", color=KEY_GREEN,
                      label_color=KEY_GREEN, height=1.0)
        pk_box = _box("Public Key\n(identityKeyB64)", color=RELAY_BLUE,
                      label_color=RELAY_BLUE, height=1.0)
        sig_box = _box("Signed Prekey\n+ Signature", color=EMBER_ORANGE,
                       label_color=EMBER_ORANGE, height=1.0)

        bundle = VGroup(sk_box, pk_box, sig_box).arrange(DOWN, buff=0.35)
        bundle.shift(RIGHT * 2.8 + DOWN * 0.15)

        bundle_label = Text("StoredDeviceBundle", font_size=20,
                            color=EMBER_CREAM)
        bundle_bg = SurroundingRectangle(
            bundle, color=EMBER_GRAY, fill_color="#150C08",
            fill_opacity=0.9, corner_radius=0.14, buff=0.28,
        )
        bundle_label.next_to(bundle_bg, UP, buff=0.12)

        fn_arrow = Arrow(
            code_block.get_right() + RIGHT * 0.05,
            bundle_bg.get_left() + LEFT * 0.05,
            buff=0.1, color=EMBER_ORANGE, stroke_width=3,
        )
        fn_label = Text("createStoredDeviceBundle()",
                        font_size=15, color=EMBER_ORANGE)
        fn_label.next_to(fn_arrow, UP, buff=0.08)

        self.play(GrowArrow(fn_arrow), Write(fn_label))
        self.play(FadeIn(bundle_bg), Write(bundle_label))
        self.play(
            LaggedStart(
                FadeIn(sk_box, shift=LEFT * 0.2),
                FadeIn(pk_box, shift=LEFT * 0.2),
                FadeIn(sig_box, shift=LEFT * 0.2),
                lag_ratio=0.3,
            )
        )

        # Highlight private key stays on device
        priv_note = Text("Never leaves the device", font_size=16,
                         color=KEY_GREEN)
        priv_note.next_to(sk_box, RIGHT, buff=0.18)
        self.play(Indicate(sk_box[0], color=KEY_GREEN, scale_factor=1.08))
        self.play(Write(priv_note))

        # Highlight public key uploaded to relay
        pub_note = Text("Uploaded to relay\n(PrekeyBundle)", font_size=16,
                        color=RELAY_BLUE)
        pub_note.next_to(pk_box, RIGHT, buff=0.18)
        self.play(Indicate(pk_box[0], color=RELAY_BLUE, scale_factor=1.08))
        self.play(Write(pub_note))

        self.wait(2)
        self.play(FadeOut(VGroup(
            heading, code_group, bundle_bg, bundle_label, bundle,
            fn_arrow, fn_label, priv_note, pub_note,
        )))


# ════════════════════════════════════════════════════════════════════════════
# Scene 3 – E2EE Message Encryption & Mailbox Delivery
# ════════════════════════════════════════════════════════════════════════════
class E2EEMessageScene(Scene):
    def construct(self):
        self.camera.background_color = EMBER_DARK

        heading = Text("E2EE Message – Encrypt, Deliver, Decrypt",
                       font_size=30, color=EMBER_CREAM)
        heading.to_edge(UP, buff=0.45)
        self.play(Write(heading))

        # ── Actors ──────────────────────────────────────────────────────────
        sender_icon   = self._device_icon(RELAY_BLUE, "Sender")
        relay_icon    = self._relay_icon()
        receiver_icon = self._device_icon(KEY_GREEN, "Recipient")

        sender_icon.shift(LEFT * 5)
        relay_icon.move_to(ORIGIN)
        receiver_icon.shift(RIGHT * 5)

        self.play(
            LaggedStart(
                FadeIn(sender_icon, shift=RIGHT * 0.3),
                FadeIn(relay_icon, shift=UP * 0.2),
                FadeIn(receiver_icon, shift=LEFT * 0.3),
                lag_ratio=0.25,
            )
        )

        # ── Step 1: Plaintext on sender ──────────────────────────────────
        msg_plain = _box('"Hello, Alice 🔥"', width=3.0, height=0.75,
                         color=PLAIN_TEAL, label_color=PLAIN_TEAL)
        msg_plain.next_to(sender_icon, DOWN, buff=0.55)
        self.play(FadeIn(msg_plain, shift=DOWN * 0.1))

        step1 = Text("① nacl.box(plaintext, nonce,\n"
                     "   recipientPublicKey, senderPrivateKey)",
                     font_size=17, color=EMBER_ORANGE)
        step1.next_to(sender_icon, UP, buff=0.3)
        self.play(Write(step1))
        self.wait(0.5)

        # ── Step 2: Ciphertext box ────────────────────────────────────────
        msg_cipher = _box("CipherEnvelope\n{ nonce, boxB64 }",
                          width=3.0, height=0.85,
                          color=CIPHER_RED, label_color=CIPHER_RED)
        msg_cipher.move_to(msg_plain)

        lock_anim = Flash(msg_plain[0], color=CIPHER_RED, line_length=0.18,
                          num_lines=10, run_time=0.6)
        self.play(lock_anim,
                  ReplacementTransform(msg_plain, msg_cipher, run_time=0.8))
        self.wait(0.3)

        # ── Step 3: Send to relay mailbox ────────────────────────────────
        travel_arrow = Arrow(
            msg_cipher.get_right(),
            relay_icon.get_left() + LEFT * 0.1,
            buff=0.1, color=CIPHER_RED, stroke_width=3,
        )
        relay_label = Text("relay mailbox\n(Cloudflare D1)", font_size=15,
                           color=GRAY)
        relay_label.next_to(relay_icon, DOWN, buff=0.18)

        self.play(GrowArrow(travel_arrow))
        envelope_copy = msg_cipher.copy()
        self.play(
            envelope_copy.animate.move_to(relay_icon.get_center()),
            run_time=0.9,
        )
        self.play(FadeIn(relay_label), FadeOut(travel_arrow))
        self.wait(0.3)

        # ── Step 4: Relay forwards to recipient ─────────────────────────
        fwd_arrow = Arrow(
            relay_icon.get_right(),
            receiver_icon.get_left() + LEFT * 0.1,
            buff=0.1, color=CIPHER_RED, stroke_width=3,
        )
        envelope_at_rcvr = msg_cipher.copy()
        envelope_at_rcvr.next_to(receiver_icon, DOWN, buff=0.55)

        self.play(GrowArrow(fwd_arrow))
        self.play(
            FadeIn(envelope_at_rcvr, shift=RIGHT * 0.15),
            FadeOut(fwd_arrow, run_time=0.4),
        )

        step4 = Text("④ nacl.box.open(ciphertext, nonce,\n"
                     "   senderPublicKey, recipientPrivateKey)",
                     font_size=17, color=KEY_GREEN)
        step4.next_to(receiver_icon, UP, buff=0.3)
        self.play(Write(step4))

        # ── Step 5: Decrypt ──────────────────────────────────────────────
        msg_decrypted = _box('"Hello, Alice 🔥"', width=3.0, height=0.75,
                             color=PLAIN_TEAL, label_color=PLAIN_TEAL)
        msg_decrypted.move_to(envelope_at_rcvr)

        unlock_anim = Flash(envelope_at_rcvr[0], color=KEY_GREEN,
                            line_length=0.18, num_lines=10, run_time=0.6)
        self.play(unlock_anim,
                  ReplacementTransform(envelope_at_rcvr, msg_decrypted,
                                       run_time=0.8))

        success = Text("✓ Message decrypted on device only",
                       font_size=20, color=KEY_GREEN)
        success.to_edge(DOWN, buff=0.45)
        self.play(Write(success))
        self.wait(2)

        self.play(FadeOut(VGroup(
            heading, sender_icon, relay_icon, receiver_icon,
            msg_cipher, envelope_copy, msg_decrypted,
            step1, step4, relay_label, success,
        )))

    # ── helpers ─────────────────────────────────────────────────────────────
    @staticmethod
    def _device_icon(color: str, label: str) -> VGroup:
        rect = RoundedRectangle(corner_radius=0.12, width=1.4, height=2.0,
                                color=color, fill_color=EMBER_DARK,
                                fill_opacity=0.9, stroke_width=2.5)
        screen = Rectangle(width=1.1, height=1.35, color=color,
                            fill_color="#111", fill_opacity=1,
                            stroke_width=1.5)
        screen.move_to(rect.get_center() + UP * 0.2)
        btn = Circle(radius=0.12, color=color, fill_color=EMBER_DARK,
                     fill_opacity=1, stroke_width=2)
        btn.next_to(screen, DOWN, buff=0.08)
        lbl = Text(label, font_size=18, color=color)
        lbl.next_to(rect, DOWN, buff=0.18)
        return VGroup(rect, screen, btn, lbl)

    @staticmethod
    def _relay_icon() -> VGroup:
        cloud = RoundedRectangle(corner_radius=0.4, width=2.2, height=1.2,
                                 color=RELAY_BLUE, fill_color="#0B1A33",
                                 fill_opacity=0.95, stroke_width=2.5)
        lbl = Text("Relay\n(Cloudflare)", font_size=18, color=RELAY_BLUE)
        lbl.move_to(cloud.get_center())
        return VGroup(cloud, lbl)


# ════════════════════════════════════════════════════════════════════════════
# Scene 4 – Attachment Symmetric Encryption (secretbox)
# ════════════════════════════════════════════════════════════════════════════
class AttachmentScene(Scene):
    def construct(self):
        self.camera.background_color = EMBER_DARK

        heading = Text("Attachment Encryption – nacl.secretbox",
                       font_size=32, color=EMBER_CREAM)
        heading.to_edge(UP, buff=0.45)
        self.play(Write(heading))

        # Code reference
        snippet_lines = [
            "// packages/protocol/src/e2ee.ts",
            "function encryptAttachmentBytes(value) {",
            "  const fileKey = nacl.randomBytes(secretbox.keyLength);",
            "  const fileIv  = nacl.randomBytes(secretbox.nonceLength);",
            "  const ciphertext = nacl.secretbox(plaintext, fileIv, fileKey);",
            "  return { ciphertext, fileKeyB64, fileIvB64,",
            "           plaintextSha256B64, ciphertextSha256B64 };",
            "}",
        ]
        snippet = VGroup(*[
            Text(l, font_size=17, color=PLAIN_TEAL, font="Courier New")
            for l in snippet_lines
        ]).arrange(DOWN, aligned_edge=LEFT, buff=0.08)
        snippet_bg = SurroundingRectangle(
            snippet, color=EMBER_GRAY, fill_color="#150C08",
            fill_opacity=1, corner_radius=0.1, buff=0.22,
        )
        snippet_group = VGroup(snippet_bg, snippet)
        snippet_group.shift(LEFT * 2.6 + DOWN * 0.3)

        self.play(FadeIn(snippet_bg), LaggedStart(
            *[Write(l, run_time=0.22) for l in snippet],
            lag_ratio=0.1,
        ))
        self.wait(0.3)

        # Visualise the encryption on the right
        file_plain  = _box("📎 Attachment\n(plaintext bytes)",
                           width=3.2, height=0.9,
                           color=PLAIN_TEAL, label_color=PLAIN_TEAL)
        key_box     = _box("fileKey  (random 32 B)\nfileIv   (random 24 B)",
                           width=3.2, height=0.9,
                           color=GOLD, label_color=GOLD)
        secretbox   = _box("nacl.secretbox()", width=3.2, height=0.75,
                           color=EMBER_ORANGE, label_color=EMBER_ORANGE)
        file_cipher = _box("Encrypted bytes\n+ SHA-256 hashes",
                           width=3.2, height=0.9,
                           color=CIPHER_RED, label_color=CIPHER_RED)
        key_embed   = _box("fileKeyB64 / fileIvB64\n→ inside CipherEnvelope",
                           width=3.2, height=0.9,
                           color=KEY_GREEN, label_color=KEY_GREEN)

        flow = VGroup(file_plain, key_box, secretbox, file_cipher, key_embed)
        flow.arrange(DOWN, buff=0.22)
        flow.shift(RIGHT * 2.6 + DOWN * 0.15)

        arrows = VGroup(*[
            Arrow(flow[i].get_bottom(), flow[i + 1].get_top(),
                  buff=0.05, stroke_width=2.5, color=EMBER_GRAY)
            for i in range(len(flow) - 1)
        ])

        self.play(
            LaggedStart(
                *[AnimationGroup(FadeIn(flow[i]), GrowArrow(arrows[i]))
                  if i < len(arrows) else FadeIn(flow[i])
                  for i in range(len(flow))],
                lag_ratio=0.35,
            )
        )
        self.wait(2)
        self.play(FadeOut(VGroup(heading, snippet_group, flow, arrows)))


# ════════════════════════════════════════════════════════════════════════════
# Scene 5 – System Architecture Overview
# ════════════════════════════════════════════════════════════════════════════
class ArchitectureScene(Scene):
    def construct(self):
        self.camera.background_color = EMBER_DARK

        heading = Text("EmberChamber – System Architecture",
                       font_size=32, color=EMBER_CREAM)
        heading.to_edge(UP, buff=0.4)
        self.play(Write(heading))

        # ── Client layer ────────────────────────────────────────────────
        android  = _box("📱 Mobile\n(Expo / Android)", width=2.4, height=0.9,
                        color=RELAY_BLUE, label_color=RELAY_BLUE)
        desktop  = _box("🖥  Desktop\n(Tauri / Win·Ubuntu)", width=2.4,
                        height=0.9, color=RELAY_BLUE, label_color=RELAY_BLUE)
        web_app  = _box("🌐 Web\n(Next.js)", width=2.4, height=0.9,
                        color=RELAY_BLUE, label_color=RELAY_BLUE)

        clients = VGroup(android, desktop, web_app).arrange(RIGHT, buff=0.45)
        clients.shift(UP * 1.9)

        clients_brace = Brace(clients, UP, color=RELAY_BLUE)
        clients_label = clients_brace.get_text("Client Layer", buff=0.08)
        clients_label.set_color(RELAY_BLUE)
        clients_label.scale(0.75)

        # ── Core layer ──────────────────────────────────────────────────
        rust_core = _box("crates/core\n(Rust local-first sync)",
                         width=2.7, height=0.9,
                         color=EMBER_ORANGE, label_color=EMBER_ORANGE)
        protocol  = _box("packages/protocol\n(TS E2EE contracts)",
                         width=2.7, height=0.9,
                         color=EMBER_ORANGE, label_color=EMBER_ORANGE)
        core_row  = VGroup(rust_core, protocol).arrange(RIGHT, buff=0.5)
        core_row.shift(UP * 0.35)

        # ── Relay layer ─────────────────────────────────────────────────
        relay = RoundedRectangle(
            corner_radius=0.2, width=6.5, height=1.1,
            color=RELAY_BLUE, fill_color="#0B1A33", fill_opacity=0.95,
            stroke_width=2.5,
        )
        relay.shift(DOWN * 1.3)
        relay_lbl = Text(
            "apps/relay – Cloudflare Workers + Durable Objects + D1 + R2",
            font_size=17, color=RELAY_BLUE,
        )
        relay_lbl.move_to(relay.get_center())

        # ── Storage layer ───────────────────────────────────────────────
        d1   = _box("D1 (SQLite)\nMailbox / Metadata", width=2.4, height=0.9,
                    color=GRAY, label_color=LIGHT_GRAY)
        r2   = _box("R2 (Object)\nEncrypted Attachments", width=2.4,
                    height=0.9, color=GRAY, label_color=LIGHT_GRAY)
        dobj = _box("Durable Objects\nSessions / Groups", width=2.4,
                    height=0.9, color=GRAY, label_color=LIGHT_GRAY)
        storage = VGroup(d1, r2, dobj).arrange(RIGHT, buff=0.35)
        storage.shift(DOWN * 2.85)

        # ── Arrows ──────────────────────────────────────────────────────
        def _down_arrow(mob_top, mob_bot, color=WHITE):
            return Arrow(
                mob_top.get_bottom(), mob_bot.get_top(),
                buff=0.1, stroke_width=2.5, color=color,
                max_tip_length_to_length_ratio=0.15,
            )

        client_to_core  = VGroup(*[
            _down_arrow(c, rust_core if i < 1 else protocol, RELAY_BLUE)
            for i, c in enumerate(clients)
        ])
        core_to_relay   = VGroup(
            _down_arrow(rust_core, relay, EMBER_ORANGE),
            _down_arrow(protocol,  relay, EMBER_ORANGE),
        )
        relay_to_storage = VGroup(*[
            _down_arrow(relay, s, RELAY_BLUE) for s in storage
        ])

        # ── Animate ─────────────────────────────────────────────────────
        self.play(
            LaggedStart(
                FadeIn(clients, shift=DOWN * 0.15),
                FadeIn(clients_brace), Write(clients_label),
                lag_ratio=0.2,
            )
        )
        self.play(
            LaggedStart(
                *[GrowArrow(a) for a in client_to_core],
                lag_ratio=0.15,
            )
        )
        self.play(FadeIn(core_row, shift=DOWN * 0.1))
        self.play(
            LaggedStart(
                *[GrowArrow(a) for a in core_to_relay],
                lag_ratio=0.2,
            )
        )
        self.play(FadeIn(relay, shift=DOWN * 0.1), Write(relay_lbl))
        self.play(
            LaggedStart(
                *[GrowArrow(a) for a in relay_to_storage],
                lag_ratio=0.2,
            )
        )
        self.play(FadeIn(storage, shift=DOWN * 0.1))
        self.wait(2.5)
        self.play(FadeOut(VGroup(
            heading, clients, clients_brace, clients_label,
            core_row, relay, relay_lbl, storage,
            client_to_core, core_to_relay, relay_to_storage,
        )))


# ════════════════════════════════════════════════════════════════════════════
# Composite – all scenes in one render target
# ════════════════════════════════════════════════════════════════════════════
class EmberChamberVideo(
    TitleScene,
    DeviceBundleScene,
    E2EEMessageScene,
    AttachmentScene,
    ArchitectureScene,
):
    """Render the full EmberChamber explainer in one pass."""

    def construct(self):
        TitleScene.construct(self)
        DeviceBundleScene.construct(self)
        E2EEMessageScene.construct(self)
        AttachmentScene.construct(self)
        ArchitectureScene.construct(self)
