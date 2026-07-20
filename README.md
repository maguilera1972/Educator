# LMS-Educator

Plateforme LMS (Learning Management System) pour formations : cours, modules, leçons, quiz, slides, vidéos, documents et labs.

**Dépôt public :** [https://git.aguilera.ch/Aguilera_Lab/Educator](https://git.aguilera.ch/Aguilera_Lab/Educator)

## Fonctionnalités

- Rôles apprenant / formateur / administrateur
- Catalogue de formations (dont Microsoft) et inscriptions
- Matériel pédagogique (slides, vidéos, docs, labs) avec sections
- Import de dossiers vidéo → sections créées automatiquement
- Upload de gros fichiers par fragments (compatible proxy Cloudflare)
- Lecteurs intégrés, suivi de consultation, i18n (FR / EN / IT / ES / DE)
- Option tunnel Cloudflare + Zero Trust

## Prérequis

- Node.js **18+** (20 LTS recommandé) et npm
- Linux (ou équivalent) pour les scripts systemd / Cloudflare
- ~200 Mo disque à vide ; plus selon les vidéos uploadées

## Installation rapide

```bash
git clone https://git.aguilera.ch/Aguilera_Lab/Educator.git
cd Educator
chmod +x scripts/install.sh start.sh
./scripts/install.sh
# Éditer .env (PUBLIC_URL, JWT_SECRET, ADMIN_*)
npm start
```

Ouvrir `http://127.0.0.1:3000` — compte admin défini dans `.env` (par défaut `admin@example.com` / `ChangeMeNow!` si non configuré).

Guide détaillé : [docs/INSTALL.md](docs/INSTALL.md)

## Mises à jour du dépôt Gitea

Après chaque évolution du logiciel, le dépôt public est synchronisé avec :

```bash
./scripts/publish-to-gitea.sh "Description courte du changement"
```

Le jeton d’accès se place dans `~/.config/lms-educator/gitea.token` (hors dépôt) ou dans `GITEA_TOKEN`.

Simulation : `./scripts/publish-to-gitea.sh --dry-run`

## Configuration

Copier `.env.example` vers `.env` :

| Variable | Rôle |
|----------|------|
| `PORT` | Port HTTP (défaut `3000`) |
| `PUBLIC_URL` | URL publique du site |
| `JWT_SECRET` | Secret de session (fort, unique) |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | Compte admin initial |
| `TRUST_PROXY` | `1` derrière Cloudflare / reverse proxy |

Les données (SQLite, JWT persisté, uploads) restent dans `data/` et `uploads/` (non versionnés).

## Production

```bash
# Service systemd (adapter les chemins dans le fichier unit)
sudo ./scripts/install-systemd-service.sh

# Tunnel Cloudflare (optionnel)
./scripts/setup-cloudflare-tunnel.sh
```

Exemples : `deploy/systemd/`, `deploy/cloudflared/config.example.yml`, `nginx-lms.conf`.

## Développement

```bash
npm install
npm run dev
```

Santé : `GET /api/health`

## Licence

ISC — Aguilera Lab
