#!/usr/bin/env bash
# Installation locale de LMS-Educator (Node.js + dépendances + .env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== LMS-Educator — installation ==="
echo "Répertoire : $ROOT"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js est requis (v18+ recommandé)."
  echo "Installez-le puis relancez ce script."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm est requis."
  exit 1
fi

echo "Node : $(node -v)"
echo "npm  : $(npm -v)"
echo

if [[ ! -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Fichier .env créé depuis .env.example — éditez-le avant la production."
else
  echo "Fichier .env déjà présent — conservé."
fi

mkdir -p "$ROOT/data" "$ROOT/uploads" "$ROOT/logs"

echo
echo "Installation des dépendances npm…"
npm install

echo
echo "OK — pour démarrer :"
echo "  cd \"$ROOT\""
echo "  npm start"
echo
echo "Santé : curl -s http://127.0.0.1:3000/api/health"
echo
echo "Documentation : README.md et docs/INSTALL.md"
echo "Dépôt : https://git.aguilera.ch/Aguilera_Lab/Educator"
