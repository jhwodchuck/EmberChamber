"""
EmberChamber – Manim animation: Full App Overview
=================================================

Run
---
    manim -pqh tools/manim/emberchamber_app_overview.py EmberChamberAppOverviewVideo

Preview
-------
    manim -pql tools/manim/emberchamber_app_overview.py EmberChamberAppOverviewVideo
"""

from manim import (
    Scene,
    Text,
    VGroup,
    RoundedRectangle,
    Arrow,
    Polygon,
    Line,
    Dot,
    FadeIn,
    FadeOut,
    Write,
    GrowArrow,
    LaggedStart,
    DrawBorderThenFill,
    Transform,
    UP,
    DOWN,
    LEFT,
    RIGHT,
    WHITE,
    GRAY,
)


# Brand palette
EMBER_ORANGE = "#E05C2A"
EMBER_DARK = "#1A0F0A"
EMBER_CREAM = "#F5EDE3"
EMBER_GRAY = "#4A3728"
RELAY_BLUE = "#2A6EE0"
KEY_GREEN = "#2AE06E"
PLAIN_TEAL = "#2AE0C8"
WARN_RED = "#E02A6E"


def card(
    label: str,
    *,
    width: float = 2.8,
    height: float = 1.0,
    color: str = WHITE,
    label_color: str = WHITE,
    font_size: int = 22,
) -> VGroup:
    box = RoundedRectangle(
        corner_radius=0.12,
        width=width,
        height=height,
        color=color,
        fill_color=EMBER_DARK,
        fill_opacity=0.88,
        stroke_width=2,
    )
    text = Text(label, color=label_color, font_size=font_size)
    text.move_to(box.get_center())
    return VGroup(box, text)


class EmberChamberAppOverviewVideo(Scene):
    def construct(self):
        self.camera.background_color = EMBER_DARK

        # 1) Title card
        flame = Polygon(
            [0, 0.95, 0],
            [0.42, 0.32, 0],
            [0.2, 0.45, 0],
            [0.52, -0.28, 0],
            [0, 0.08, 0],
            [-0.52, -0.28, 0],
            [-0.2, 0.45, 0],
            [-0.42, 0.32, 0],
            fill_color=EMBER_ORANGE,
            fill_opacity=1,
            stroke_width=0,
        ).scale(0.9)

        brand = Text("EmberChamber", color=EMBER_CREAM, font_size=56, weight="BOLD")
        sub = Text("Complete App Overview", color=EMBER_ORANGE, font_size=28)
        brand.next_to(flame, DOWN, buff=0.35)
        sub.next_to(brand, DOWN, buff=0.22)

        self.play(DrawBorderThenFill(flame, run_time=1.0))
        self.play(Write(brand), FadeIn(sub, shift=UP * 0.15))
        self.wait(0.6)
        self.play(FadeOut(VGroup(flame, brand, sub)))

        # 2) Platforms and product shape
        heading = Text("One network, multiple clients", color=EMBER_CREAM, font_size=34)
        heading.to_edge(UP, buff=0.45)

        mobile = card("Mobile\n(Primary)", color=KEY_GREEN, label_color=KEY_GREEN, width=2.4)
        desktop = card("Desktop", color=PLAIN_TEAL, label_color=PLAIN_TEAL, width=2.4)
        web = card("Web\n(Secondary)", color=RELAY_BLUE, label_color=RELAY_BLUE, width=2.4)
        clients = VGroup(mobile, desktop, web).arrange(RIGHT, buff=0.65).shift(UP * 1.0)

        relay = card("Cloudflare Relay", color=RELAY_BLUE, label_color=RELAY_BLUE, width=3.4)
        relay.shift(DOWN * 1.0)

        a1 = Arrow(mobile.get_bottom(), relay.get_top() + LEFT * 1.4, buff=0.12, color=EMBER_ORANGE)
        a2 = Arrow(desktop.get_bottom(), relay.get_top(), buff=0.12, color=EMBER_ORANGE)
        a3 = Arrow(web.get_bottom(), relay.get_top() + RIGHT * 1.4, buff=0.12, color=EMBER_ORANGE)

        self.play(Write(heading))
        self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.15) for c in clients], lag_ratio=0.2))
        self.play(FadeIn(relay, shift=DOWN * 0.15))
        self.play(LaggedStart(GrowArrow(a1), GrowArrow(a2), GrowArrow(a3), lag_ratio=0.15))
        self.wait(0.6)

        # 3) Onboarding flow
        onboarding = Text("Invite-only onboarding", color=EMBER_CREAM, font_size=32)
        onboarding.move_to(heading)
        self.play(Transform(heading, onboarding))

        invite = card("Invite Link", color=EMBER_ORANGE, label_color=EMBER_ORANGE, width=2.4)
        adult = card("18+ Affirmation", color=EMBER_ORANGE, label_color=EMBER_ORANGE, width=2.9)
        magic = card("Email Magic Link", color=KEY_GREEN, label_color=KEY_GREEN, width=3.1)
        passkey = card("Passkeys (Next)", color=PLAIN_TEAL, label_color=PLAIN_TEAL, width=2.8)

        flow = VGroup(invite, adult, magic, passkey).arrange(RIGHT, buff=0.45).shift(DOWN * 0.5)
        flow_arrows = VGroup(
            Arrow(invite.get_right(), adult.get_left(), buff=0.1, color=EMBER_CREAM),
            Arrow(adult.get_right(), magic.get_left(), buff=0.1, color=EMBER_CREAM),
            Arrow(magic.get_right(), passkey.get_left(), buff=0.1, color=EMBER_CREAM),
        )

        self.play(FadeOut(VGroup(clients, relay, a1, a2, a3), shift=DOWN * 0.2))
        self.play(LaggedStart(*[FadeIn(x, shift=UP * 0.1) for x in flow], lag_ratio=0.2))
        self.play(LaggedStart(*[GrowArrow(a) for a in flow_arrows], lag_ratio=0.2))
        self.wait(0.6)

        # 4) Feature map
        features_title = Text("Messaging + community layers", color=EMBER_CREAM, font_size=32)
        features_title.move_to(heading)
        self.play(Transform(heading, features_title))

        dm = card("Direct Messages", color=KEY_GREEN, label_color=KEY_GREEN)
        groups = card("Small Groups", color=KEY_GREEN, label_color=KEY_GREEN)
        communities = card("Invite-Gated\nCommunities", color=RELAY_BLUE, label_color=RELAY_BLUE)
        rooms = card("Private Rooms", color=RELAY_BLUE, label_color=RELAY_BLUE)

        top_row = VGroup(dm, groups).arrange(RIGHT, buff=0.5)
        bottom_row = VGroup(communities, rooms).arrange(RIGHT, buff=0.5)
        feature_grid = VGroup(top_row, bottom_row).arrange(DOWN, buff=0.4).shift(DOWN * 0.4)

        self.play(FadeOut(VGroup(flow, flow_arrows), shift=DOWN * 0.2))
        self.play(LaggedStart(*[FadeIn(m, shift=UP * 0.12) for m in feature_grid], lag_ratio=0.12))
        self.wait(0.6)

        # 5) Runtime architecture map
        arch_title = Text("Beta runtime architecture", color=EMBER_CREAM, font_size=32)
        arch_title.move_to(heading)
        self.play(Transform(heading, arch_title))

        clients_box = card("apps/mobile · apps/desktop · apps/web", color=PLAIN_TEAL, label_color=PLAIN_TEAL, width=6.7)
        crypto_box = card("packages/protocol + crates/core", color=KEY_GREEN, label_color=KEY_GREEN, width=5.6)
        relay_box = card("apps/relay control plane", color=RELAY_BLUE, label_color=RELAY_BLUE, width=4.2)
        storage_box = card("D1 · R2 · Durable Objects", color=EMBER_ORANGE, label_color=EMBER_ORANGE, width=4.4)

        stack = VGroup(clients_box, crypto_box, relay_box, storage_box).arrange(DOWN, buff=0.28).shift(DOWN * 0.25)

        line1 = Arrow(clients_box.get_bottom(), crypto_box.get_top(), buff=0.08, color=EMBER_CREAM)
        line2 = Arrow(crypto_box.get_bottom(), relay_box.get_top(), buff=0.08, color=EMBER_CREAM)
        line3 = Arrow(relay_box.get_bottom(), storage_box.get_top(), buff=0.08, color=EMBER_CREAM)

        self.play(FadeOut(feature_grid, shift=DOWN * 0.2))
        self.play(LaggedStart(*[FadeIn(b, shift=UP * 0.1) for b in stack], lag_ratio=0.12))
        self.play(LaggedStart(GrowArrow(line1), GrowArrow(line2), GrowArrow(line3), lag_ratio=0.18))
        self.wait(0.8)

        # 6) Privacy + safety
        privacy_title = Text("Privacy and safety constraints", color=EMBER_CREAM, font_size=32)
        privacy_title.move_to(heading)
        self.play(Transform(heading, privacy_title))

        yes1 = Text("✓ End-to-end encrypted DMs and groups", color=KEY_GREEN, font_size=28)
        yes2 = Text("✓ Local-first message history on device", color=KEY_GREEN, font_size=28)
        yes3 = Text("✓ Organizer/admin invite control (phase 1)", color=KEY_GREEN, font_size=28)

        no1 = Text("✗ No public discovery growth loops", color=WARN_RED, font_size=26)
        no2 = Text("✗ No server-side search over private content", color=WARN_RED, font_size=26)
        no3 = Text("✗ No phone-number identity model", color=WARN_RED, font_size=26)

        yes = VGroup(yes1, yes2, yes3).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
        no = VGroup(no1, no2, no3).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
        policy = VGroup(yes, no).arrange(DOWN, aligned_edge=LEFT, buff=0.45).shift(DOWN * 0.35)

        self.play(FadeOut(VGroup(stack, line1, line2, line3), shift=DOWN * 0.2))
        self.play(LaggedStart(*[FadeIn(t, shift=UP * 0.07) for t in policy], lag_ratio=0.08))
        self.wait(1.0)

        # 7) Closing card
        close = VGroup(
            Text("EmberChamber", color=EMBER_CREAM, font_size=54, weight="BOLD"),
            Text("Private messaging for trusted communities", color=EMBER_ORANGE, font_size=28),
            Text("Invite-only beta across mobile, desktop, and web", color=GRAY, font_size=20),
        ).arrange(DOWN, buff=0.28)

        divider = Line(LEFT * 3.3, RIGHT * 3.3, color=EMBER_GRAY)
        dot = Dot(color=EMBER_ORANGE).scale(1.1).move_to(divider.get_center())

        self.play(FadeOut(VGroup(heading, policy), shift=DOWN * 0.2))
        self.play(FadeIn(close[0], shift=UP * 0.1))
        self.play(FadeIn(close[1], shift=UP * 0.1))
        self.play(FadeIn(VGroup(divider, dot), shift=UP * 0.05), FadeIn(close[2], shift=UP * 0.05))
        self.wait(2.0)
        self.play(FadeOut(VGroup(close, divider, dot)))
