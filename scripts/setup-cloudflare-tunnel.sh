#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CF_CONFIG_DIR="${HOME}/.cloudflared"
CF_CONFIG="${CF_CONFIG_DIR}/config.yml"
EXAMPLE="${APP_DIR}/deploy/cloudflared/config.example.yml"
HOSTNAME="lms-educator.eureka-training.online"
TUNNEL_NAME="lms-educator"

echo "=== LMS-Educator — Cloudflare Tunnel (Zero Trust) ==="
echo "Répertoire application : ${APP_DIR}"
echo "URL publique           : https://${HOSTNAME}/"
echo

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared n'est pas installé."
  echo "Installez-le : https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

mkdir -p "${CF_CONFIG_DIR}"

if [[ ! -f "${CF_CONFIG}" ]]; then
  if [[ ! -f "${EXAMPLE}" ]]; then
    echo "Fichier exemple introuvable : ${EXAMPLE}"
    exit 1
  fi
  cp "${EXAMPLE}" "${CF_CONFIG}"
  echo "Config créée : ${CF_CONFIG}"
  echo "Éditez ce fichier et remplacez <TUNNEL_ID> avant de lancer le tunnel."
fi

echo
echo "Étapes Cloudflare Zero Trust (dashboard) :"
echo "  1. Zero Trust → Access → Applications → Add an application"
echo "  2. Type : Self-hosted"
echo "  3. Domain : ${HOSTNAME}"
echo "  4. Policy : emails autorisés (ex. @eureka-training.online, @aguilera.ch)"
echo
echo "Étapes tunnel (CLI) :"
echo "  cloudflared tunnel login"
echo "  cloudflared tunnel create ${TUNNEL_NAME}"
echo "  cloudflared tunnel route dns ${TUNNEL_NAME} ${HOSTNAME}"
echo "  cloudflared tunnel run ${TUNNEL_NAME}"
echo
echo "Services systemd (optionnel) :"
echo "  sudo cp ${APP_DIR}/deploy/systemd/lms-educator.service /etc/systemd/system/"
echo "  sudo cp ${APP_DIR}/deploy/systemd/cloudflared-lms.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable --now lms-educator cloudflared-lms"
