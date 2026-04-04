#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

infer_repo() {
  local remote
  remote="$(git -C "$ROOT_DIR" remote get-url origin)"
  remote="${remote#https://github.com/}"
  remote="${remote#git@github.com:}"
  remote="${remote%.git}"
  printf '%s\n' "$remote"
}

ensure_linux_x64() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    echo "This setup script currently supports Linux only." >&2
    exit 1
  fi

  case "$(uname -m)" in
    x86_64)
      RUNNER_ARCH="x64"
      ;;
    *)
      echo "Unsupported architecture: $(uname -m). Expected x86_64." >&2
      exit 1
      ;;
  esac
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

ensure_packages() {
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    tar \
    git \
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libssl-dev \
    pkg-config
}

download_runner() {
  local version archive url

  version="${RUNNER_VERSION:-$(gh release view --repo actions/runner --json tagName --jq '.tagName' | sed 's/^v//')}"
  archive="actions-runner-linux-${RUNNER_ARCH}-${version}.tar.gz"
  url="https://github.com/actions/runner/releases/download/v${version}/${archive}"

  mkdir -p "$RUNNER_ROOT"
  cd "$RUNNER_ROOT"

  if [[ ! -x ./config.sh || ! -f .runner-version || "$(cat .runner-version)" != "$version" ]]; then
    if [[ -x ./svc.sh ]]; then
      sudo ./svc.sh stop >/dev/null 2>&1 || true
    fi
    rm -rf ./bin ./externals ./_diag
    rm -f ./config.sh ./env.sh ./run.sh ./svc.sh ./.env ./.path ./.credentials ./.credentials_rsaparams ./.runner
    curl -L --fail --output "$archive" "$url"
    tar xzf "$archive"
    printf '%s\n' "$version" > .runner-version
  fi
}

configure_runner() {
  local token

  cd "$RUNNER_ROOT"
  if [[ -f .runner ]]; then
    echo "Runner is already configured in $RUNNER_ROOT"
    return
  fi

  token="$(gh api -X POST "repos/${GH_REPO}/actions/runners/registration-token" --jq '.token')"

  ./config.sh \
    --unattended \
    --replace \
    --url "https://github.com/${GH_REPO}" \
    --token "$token" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    --work "$RUNNER_WORKDIR"
}

install_service() {
  cd "$RUNNER_ROOT"
  sudo ./svc.sh install "$USER" >/dev/null 2>&1 || true
  sudo ./svc.sh start
}

main() {
  ensure_linux_x64
  require_command gh
  require_command curl
  require_command tar
  require_command git

  GH_REPO="${GH_REPO:-$(infer_repo)}"
  REPO_NAME="${GH_REPO##*/}"
  RUNNER_ROOT="${RUNNER_ROOT:-$HOME/.local/share/github-actions-runners/${REPO_NAME}}"
  RUNNER_NAME="${RUNNER_NAME:-$(hostname -s)-${REPO_NAME}-trusted}"
  RUNNER_LABELS="${RUNNER_LABELS:-emberchamber-trusted}"
  RUNNER_WORKDIR="${RUNNER_WORKDIR:-_work}"

  ensure_packages
  download_runner
  configure_runner
  install_service

  cat <<EOF

Runner setup complete.

- Repo: ${GH_REPO}
- Name: ${RUNNER_NAME}
- Labels: ${RUNNER_LABELS}
- Root: ${RUNNER_ROOT}

Useful checks:

- (cd ${RUNNER_ROOT} && sudo ./svc.sh status)
- gh api repos/${GH_REPO}/actions/runners --jq '.runners[] | {name: .name, status: .status, labels: [.labels[].name]}'
EOF
}

main "$@"
