#!/usr/bin/env bash
# Install / refresh LMS-Educator systemd units so the app survives VM reboots and updates.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME=lms-educator
CF_SERVICE_NAME=cloudflared-lms
SERVICE_SRC="${APP_DIR}/deploy/systemd/${SERVICE_NAME}.service"
CF_SERVICE_SRC="${APP_DIR}/deploy/systemd/${CF_SERVICE_NAME}.service"
SERVICE_DST="/etc/systemd/system/${SERVICE_NAME}.service"
CF_SERVICE_DST="/etc/systemd/system/${CF_SERVICE_NAME}.service"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ce script doit être exécuté en root (sudo)."
  echo "  sudo $0"
  exit 1
fi

if [[ ! -f "$SERVICE_SRC" ]]; then
  echo "Fichier service introuvable : $SERVICE_SRC"
  exit 1
fi

if [[ ! -x /home/lms/.local/node/bin/node ]]; then
  echo "Node.js introuvable : /home/lms/.local/node/bin/node"
  exit 1
fi

echo "=== Installation du service ${SERVICE_NAME} ==="
install -m 644 "$SERVICE_SRC" "$SERVICE_DST"

# Optional Cloudflare tunnel unit (only if binary + config exist)
INSTALL_CF=0
if [[ -f "$CF_SERVICE_SRC" ]] && { [[ -x /usr/bin/cloudflared ]] || [[ -x /usr/local/bin/cloudflared ]]; } && [[ -f /home/lms/.cloudflared/config.yml ]]; then
  install -m 644 "$CF_SERVICE_SRC" "$CF_SERVICE_DST"
  INSTALL_CF=1
  echo "Service tunnel Cloudflare également installé."
else
  echo "Tunnel Cloudflare non installé (cloudflared ou config absents) — l'app locale sera quand même démarrée."
fi

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

# Allow user services (and linger) so LMS also starts after reboot without interactive login
if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger lms 2>/dev/null || true
fi

# Prefer system unit: stop user-unit / manual node to avoid port conflicts
systemctl --user -M lms@ stop lms-educator 2>/dev/null || true
pkill -u lms -f '/home/lms/lms.*server\.js' 2>/dev/null || true
pkill -u lms -f 'node server\.js' 2>/dev/null || true
sleep 1

systemctl restart "$SERVICE_NAME"

if [[ "$INSTALL_CF" -eq 1 ]]; then
  systemctl enable "$CF_SERVICE_NAME"
  systemctl restart "$CF_SERVICE_NAME"
fi

sleep 2
echo
systemctl --no-pager -l status "$SERVICE_NAME" || true
echo
if curl -sf -m 5 http://127.0.0.1:3000/api/health >/dev/null; then
  echo "OK — LMS répond sur http://127.0.0.1:3000/api/health"
else
  echo "ATTENTION — le service tourne peut-être, mais /api/health ne répond pas encore."
  journalctl -u "$SERVICE_NAME" -n 40 --no-pager || true
  exit 1
fi

echo
echo "Pour vérifier après un reboot :"
echo "  systemctl is-enabled ${SERVICE_NAME}"
echo "  systemctl status ${SERVICE_NAME}"
echo "  curl -s http://127.0.0.1:3000/api/health"
