# EmberChamber – Manim Animations

This directory contains a [Manim](https://www.manim.community/) Python script
that produces an animated explainer video for the EmberChamber E2EE messaging
codebase.

## What the video covers

| Scene | Content |
|-------|---------|
| **TitleScene** | EmberChamber brand card with flame logo |
| **DeviceBundleScene** | NaCl key-pair generation (`createStoredDeviceBundle` in `packages/protocol/src/e2ee.ts`) |
| **E2EEMessageScene** | Box encryption → CipherEnvelope → relay mailbox → recipient decrypt |
| **AttachmentScene** | Symmetric `nacl.secretbox` encryption for file attachments |
| **ArchitectureScene** | Full system map: Mobile/Desktop/Web → crates/core + packages/protocol → apps/relay → D1/R2/Durable Objects |

## Prerequisites

```
pip install manim
```

Manim also requires **FFmpeg** and **LaTeX** (optional, for math scenes):

- macOS:  `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`
- Windows: install via [ffmpeg.org](https://ffmpeg.org/download.html)

## Render the full video

```bash
# High quality (1080p, H.264)
manim -pqh tools/manim/emberchamber_e2ee.py EmberChamberVideo
```

Output is written to `media/videos/emberchamber_e2ee/1080p60/EmberChamberVideo.mp4`.

## Render individual scenes

```bash
# Low quality preview (faster)
manim -pql tools/manim/emberchamber_e2ee.py TitleScene
manim -pql tools/manim/emberchamber_e2ee.py DeviceBundleScene
manim -pql tools/manim/emberchamber_e2ee.py E2EEMessageScene
manim -pql tools/manim/emberchamber_e2ee.py AttachmentScene
manim -pql tools/manim/emberchamber_e2ee.py ArchitectureScene
```

## Quality flags

| Flag | Resolution | Use for |
|------|-----------|---------|
| `-ql` | 480p 15 fps | fast iteration |
| `-qm` | 720p 30 fps | review |
| `-qh` | 1080p 60 fps | final render |
| `-qk` | 2160p 60 fps | 4K |

## File

```
tools/manim/
├── emberchamber_e2ee.py   # animation scenes
└── README.md              # this file
```
