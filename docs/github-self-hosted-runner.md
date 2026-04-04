# Self-Hosted GitHub Actions Runner

This repo now uses a hybrid GitHub Actions setup to reduce hosted-runner minutes without exposing a public self-hosted runner to untrusted pull requests.

## Safety Model

Because `jhwodchuck/EmberChamber` is a public repository, self-hosted runners should only execute trusted events.

Current policy in this repo:

- `pull_request` CI stays on GitHub-hosted Ubuntu runners
- trusted `push` workflows run on a labeled self-hosted Linux runner
- release and deploy workflows run on the same labeled self-hosted Linux runner

The custom runner label for trusted Linux jobs is:

```text
emberchamber-trusted
```

The workflows that use it are:

- `.github/workflows/ci-web-self-hosted.yml`
- `.github/workflows/ci-rust-self-hosted.yml`
- `.github/workflows/ci-mobile-self-hosted.yml`
- `.github/workflows/build-android.yml`
- `.github/workflows/release-android.yml`
- `.github/workflows/release-linux.yml`
- `.github/workflows/deploy-web.yml`
- `.github/workflows/deploy-relay.yml`
- `.github/workflows/deploy-play-store.yml`

## Bootstrap On Ubuntu

From the repo root:

```bash
bash scripts/setup-github-runner.sh
```

Defaults:

- repo is inferred from `origin`
- runner root is `~/.local/share/github-actions-runners/EmberChamber`
- runner name is `<hostname>-EmberChamber-trusted`
- runner labels default to `emberchamber-trusted`

Optional overrides:

```bash
GH_REPO=jhwodchuck/EmberChamber \
RUNNER_NAME=mini-01-emberchamber \
RUNNER_LABELS=emberchamber-trusted \
bash scripts/setup-github-runner.sh
```

The bootstrap script:

- installs the Linux packages needed for the desktop shell checks
- downloads the latest `actions/runner` Linux x64 release
- registers the runner against this repository
- installs and starts the GitHub runner systemd service

## Verify

Local service status:

```bash
(cd ~/.local/share/github-actions-runners/EmberChamber && sudo ./svc.sh status)
```

GitHub-side status:

```bash
gh api repos/jhwodchuck/EmberChamber/actions/runners \
  --jq '.runners[] | {name: .name, status: .status, labels: [.labels[].name]}'
```

## Update Or Reinstall

Re-run the bootstrap script:

```bash
bash scripts/setup-github-runner.sh
```

To force a newer runner binary immediately:

```bash
RUNNER_VERSION=<runner-version> bash scripts/setup-github-runner.sh
```

## Remove

From the runner root:

```bash
cd ~/.local/share/github-actions-runners/EmberChamber
sudo ./svc.sh stop
sudo ./svc.sh uninstall
TOKEN=$(gh api -X POST repos/jhwodchuck/EmberChamber/actions/runners/remove-token --jq '.token')
./config.sh remove --token "$TOKEN"
```
