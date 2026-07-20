#!/usr/bin/env bash
# Publie les changements locaux vers le dépôt public Gitea LMS-Educator.
# Usage :
#   ./scripts/publish-to-gitea.sh ["message de commit"]
#   ./scripts/publish-to-gitea.sh --dry-run
#
# Authentification (dans l'ordre) :
#   1. Variable d'environnement GITEA_TOKEN
#   2. Fichier ~/.config/lms-educator/gitea.token
#
# Le jeton ne doit jamais être committé dans le dépôt.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO_SLUG="Aguilera_Lab/Educator"
REMOTE_NAME="origin"
PUBLIC_REMOTE="https://git.aguilera.ch/${REPO_SLUG}.git"
TOKEN_FILE="${GITEA_TOKEN_FILE:-${HOME}/.config/lms-educator/gitea.token}"
DRY_RUN=0
COMMIT_MSG=""

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    *)
      if [[ -z "$COMMIT_MSG" ]]; then
        COMMIT_MSG="$arg"
      fi
      ;;
  esac
done

if [[ -z "${GITEA_TOKEN:-}" && -f "$TOKEN_FILE" ]]; then
  GITEA_TOKEN="$(tr -d ' \t\r\n' < "$TOKEN_FILE")"
fi

if [[ "$DRY_RUN" -eq 0 && -z "${GITEA_TOKEN:-}" ]]; then
  echo "Jeton Gitea manquant."
  echo "Définissez GITEA_TOKEN ou créez ${TOKEN_FILE}"
  exit 1
fi

if [[ ! -d .git ]]; then
  echo "Pas de dépôt git dans ${ROOT}"
  exit 1
fi

# S'assurer que le remote pointe vers le domaine (pas l'IP)
if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote set-url "$REMOTE_NAME" "$PUBLIC_REMOTE"
else
  git remote add "$REMOTE_NAME" "$PUBLIC_REMOTE"
fi

echo "=== LMS-Educator → ${PUBLIC_REMOTE} ==="
git status -sb
echo

# Ne jamais publier des secrets
BLOCKED=$(git status --porcelain | awk '{print $NF}' | grep -E '(^|/)\.env$|\.env\.|jwt\.secret|\.db($|-)|gitea\.token' || true)
if [[ -n "$BLOCKED" ]]; then
  echo "REFUS — fichiers sensibles détectés (non publiables) :"
  echo "$BLOCKED"
  echo "Vérifiez .gitignore avant de republier."
  exit 1
fi

CHANGED=$(git status --porcelain)
AHEAD=0
if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  AHEAD=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)
fi

if [[ -z "$CHANGED" && "${AHEAD}" -eq 0 ]]; then
  echo "Rien à publier — déjà à jour."
  exit 0
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] Changements locaux :"
  git status --porcelain || true
  echo "[dry-run] Commits en avance : ${AHEAD}"
  echo "[dry-run] Aucun commit/push effectué."
  exit 0
fi

if [[ -n "$CHANGED" ]]; then
  if [[ -z "$COMMIT_MSG" ]]; then
    COMMIT_MSG="Update LMS-Educator ($(date -u +%Y-%m-%dT%H:%MZ))"
  fi

  git add -A
  if git diff --cached --name-only | grep -E '(^|/)\.env$|\.env\.|jwt\.secret|\.db($|-)|gitea\.token' >/dev/null; then
    echo "REFUS — secrets présents dans l'index"
    git reset HEAD >/dev/null
    exit 1
  fi

  if git diff --cached --quiet; then
    echo "Rien à committer après filtrage."
  else
    git -c user.name="${GIT_AUTHOR_NAME:-Michel Aguilera}" \
        -c user.email="${GIT_AUTHOR_EMAIL:-michel@aguilera.ch}" \
        commit -m "$COMMIT_MSG"
  fi
fi

AUTH_REMOTE="https://Michel:${GITEA_TOKEN}@git.aguilera.ch/${REPO_SLUG}.git"
git remote set-url "$REMOTE_NAME" "$AUTH_REMOTE"
cleanup() {
  git remote set-url "$REMOTE_NAME" "$PUBLIC_REMOTE" 2>/dev/null || true
}
trap cleanup EXIT

git push -u "$REMOTE_NAME" HEAD
cleanup
trap - EXIT

echo
echo "Publié : https://git.aguilera.ch/${REPO_SLUG}"
