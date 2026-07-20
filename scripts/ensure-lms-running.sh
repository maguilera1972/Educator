#!/usr/bin/env bash
# Health watchdog: ensure LMS is listening; restart via user systemd or start node if needed.
# Survives VM updates/reboots when paired with @reboot cron + user systemd.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="/home/lms/.local/node/bin/node"
HEALTH_URL="http://127.0.0.1:3000/api/health"
LOG_FILE="${APP_DIR}/logs/ensure-lms.log"
SERVICE_NAME="lms-educator"
LOCK_FILE="/tmp/ensure-lms-running.lock"

mkdir -p "$(dirname "$LOG_FILE")"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  exit 0
fi

log() {
  echo "$(date -Is) $*" >>"$LOG_FILE"
}

healthy() {
  curl -sf -m 5 "$HEALTH_URL" >/dev/null 2>&1
}

start_via_user_systemd() {
  systemctl --user daemon-reload >/dev/null 2>&1 || true
  systemctl --user enable "$SERVICE_NAME" >/dev/null 2>&1 || true
  if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    log "Restarting user unit ${SERVICE_NAME}"
    systemctl --user restart "$SERVICE_NAME" || return 1
  else
    log "Starting user unit ${SERVICE_NAME}"
    systemctl --user start "$SERVICE_NAME" || return 1
  fi
  return 0
}

start_via_system_systemd() {
  if ! systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then
    return 1
  fi
  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    log "Restarting system unit ${SERVICE_NAME}"
    systemctl restart "$SERVICE_NAME" 2>/dev/null || return 1
  else
    log "Starting system unit ${SERVICE_NAME}"
    systemctl start "$SERVICE_NAME" 2>/dev/null || return 1
  fi
  return 0
}

start_fallback_node() {
  if pgrep -u "$(id -u)" -f 'node server\.js' >/dev/null 2>&1; then
    return 0
  fi
  log "Fallback: starting node server.js"
  cd "$APP_DIR"
  nohup "$NODE_BIN" server.js >>/tmp/lms-server.log 2>&1 &
  disown || true
}

if healthy; then
  exit 0
fi

log "WARN: LMS health check failed — attempting recovery"

recovered=0
if start_via_user_systemd; then
  sleep 3
  if healthy; then
    log "OK: LMS recovered via user systemd"
    recovered=1
  fi
fi

if [[ "$recovered" -eq 0 ]] && start_via_system_systemd; then
  sleep 3
  if healthy; then
    log "OK: LMS recovered via system systemd"
    recovered=1
  fi
fi

if [[ "$recovered" -eq 0 ]] && [[ -x "$NODE_BIN" ]] && [[ -f "${APP_DIR}/server.js" ]]; then
  start_fallback_node
  sleep 3
  if healthy; then
    log "OK: LMS recovered via fallback"
    recovered=1
  fi
fi

if [[ "$recovered" -eq 1 ]]; then
  exit 0
fi

log "ERROR: LMS still unhealthy after recovery attempts"
exit 1
