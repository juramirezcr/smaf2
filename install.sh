#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
    echo "Ejecute este instalador con un usuario administrador, no como root."
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-v2 openssl
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER"
fi

if ! sudo docker compose version >/dev/null 2>&1; then
    echo "Docker Compose v2 no está disponible."
    exit 1
fi

if [[ ! -f .env ]]; then
    db_password="$(openssl rand -hex 24)"
    root_password="$(openssl rand -hex 32)"
    sed \
        -e "s/replace-with-a-generated-password/${db_password}/" \
        -e "s/replace-with-a-generated-root-password/${root_password}/" \
        .env.production.example > .env
    echo "Se creó .env con credenciales locales aleatorias."
fi

sudo docker compose build
sudo docker compose up -d db redis
sudo docker compose run --rm app php artisan key:generate --force
sudo docker compose run --rm app php artisan migrate --force
sudo docker compose up -d

echo "SMAF 2 está disponible en http://127.0.0.1:8082."
echo "Configure el proxy HTTPS de /smaf2/ según DEPLOYMENT.md antes de usarlo públicamente."
