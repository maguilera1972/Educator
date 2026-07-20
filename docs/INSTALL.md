# Installation de LMS-Educator

Dépôt : [https://git.aguilera.ch/Aguilera_Lab/Educator](https://git.aguilera.ch/Aguilera_Lab/Educator)

## 1. Cloner

```bash
git clone https://git.aguilera.ch/Aguilera_Lab/Educator.git
cd Educator
```

## 2. Installer les dépendances

```bash
chmod +x scripts/install.sh start.sh
./scripts/install.sh
```

Ou manuellement :

```bash
cp .env.example .env
mkdir -p data uploads logs
npm install
```

## 3. Configurer `.env`

Éditez au minimum :

```env
NODE_ENV=production
PORT=3000
PUBLIC_URL=https://votre-domaine.example
TRUST_PROXY=1
JWT_SECRET=<générez-un-secret-long>
ADMIN_EMAIL=vous@example.com
ADMIN_NAME=Votre Nom
ADMIN_PASSWORD=<mot-de-passe-fort>
```

Ne committez jamais le fichier `.env`.

## 4. Démarrer

```bash
npm start
# ou
./start.sh
```

Vérification :

```bash
curl -s http://127.0.0.1:3000/api/health
```

Connexion navigateur : `http://127.0.0.1:3000/login.html`

## 5. Service systemd (recommandé)

1. Adaptez `deploy/systemd/lms-educator.service` (utilisateur, chemins Node, `WorkingDirectory`).
2. Installez :

```bash
sudo ./scripts/install-systemd-service.sh
```

Le script active aussi le tunnel Cloudflare s’il est déjà configuré (`cloudflared` + `~/.cloudflared/config.yml`).

## 6. Exposition publique

### Option A — Cloudflare Tunnel

```bash
./scripts/setup-cloudflare-tunnel.sh
```

Suivez les instructions affichées (`cloudflared tunnel login`, création du tunnel, DNS).

Modèle de config : `deploy/cloudflared/config.example.yml`.

### Option B — Nginx

Voir `nginx-lms.conf` (proxy vers `127.0.0.1:3000`). Derrière Cloudflare, préférez le tunnel direct vers le port 3000.

## 7. Mises à jour

Sur la machine de développement (publication vers Gitea) :

```bash
./scripts/publish-to-gitea.sh "Description du changement"
```

Sur une machine installée depuis le dépôt :

```bash
cd Educator
git pull
npm install
sudo systemctl restart lms-educator   # si le service est installé
```

Les dossiers `data/` et `uploads/` sont conservés (hors Git).

## Dépannage

| Symptôme | Piste |
|----------|--------|
| Port déjà utilisé | Changer `PORT` ou arrêter l’ancien process |
| Admin introuvable | Vérifier `ADMIN_*` dans `.env`, redémarrer une fois |
| Erreur 413 à l’upload | L’app découpe les gros fichiers ; vérifier aussi les limites du proxy |
| `better-sqlite3` compile fail | Installer outils de build (`build-essential`, Python) |

Logs systemd : `journalctl -u lms-educator -f`
