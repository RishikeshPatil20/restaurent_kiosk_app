#!/usr/bin/env bash
# One-time setup of the kiosk app on Ubuntu 24.04 (ARM64). Leaves the existing site untouched.
# Usage: sudo bash setup.sh <domain>
set -euo pipefail

DOMAIN=${1:?domain required}
APP_DIR=/opt/restaurant-kiosk-app
NODE_DIR=/opt/node-22
PORT=5100
REPO=https://github.com/RishikeshPatil20/restaurent_kiosk_app.git

if ss -ltn | awk '{print $4}' | grep -qE "[:.]$PORT\$"; then echo "port $PORT busy"; exit 1; fi

echo "== Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git build-essential postgresql python3-certbot-nginx >/dev/null

echo "== Node 22 (private copy in $NODE_DIR)"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  TARBALL=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | awk '/linux-arm64.tar.xz$/{print $2}')
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$TARBALL" -o /tmp/node22.tar.xz
  curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep " $TARBALL\$" | sed "s|$TARBALL|/tmp/node22.tar.xz|" | sha256sum -c -
  mkdir -p "$NODE_DIR" && tar -xJf /tmp/node22.tar.xz -C "$NODE_DIR" --strip-components=1 && rm /tmp/node22.tar.xz
fi
"$NODE_DIR/bin/node" -v

echo "== App user and code"
id kiosk >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin kiosk
if [ ! -d "$APP_DIR/.git" ]; then
  git clone -q "$REPO" "$APP_DIR"
fi
chown -R kiosk:kiosk "$APP_DIR"

echo "== Database"
DB_PASS_FILE=/root/.kiosk_db_pass
[ -f "$DB_PASS_FILE" ] || (openssl rand -hex 24 > "$DB_PASS_FILE" && chmod 600 "$DB_PASS_FILE")
DB_PASS=$(cat "$DB_PASS_FILE")
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname='kiosk_app'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE ROLE kiosk_app LOGIN PASSWORD '$DB_PASS'"
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_database WHERE datname='restaurent_kiosk'" | grep -q 1 \
  || sudo -u postgres createdb -O kiosk_app restaurent_kiosk

echo "== .env"
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" <<EOF
PORT=$PORT
NODE_ENV=production
SECRET_KEY=$(openssl rand -hex 32)
BUSINESS_TIMEZONE=Asia/Kolkata
CORS_ORIGIN=
DB_HOST=localhost
DB_PORT=5432
DATABASE_NAME=restaurent_kiosk
USER_NAME=kiosk_app
PASSWORD=$DB_PASS
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
EOF
  chown kiosk:kiosk "$APP_DIR/.env" && chmod 600 "$APP_DIR/.env"
fi

echo "== Dependencies, seed, migrate"
cd "$APP_DIR"
sudo -u kiosk env PATH="$NODE_DIR/bin:$PATH" npm ci --omit=dev --no-audit --no-fund
if [ ! -f /root/.kiosk_seeded ]; then
  sudo -u kiosk env PATH="$NODE_DIR/bin:$PATH" npm run seed && touch /root/.kiosk_seeded
fi
sudo -u kiosk env PATH="$NODE_DIR/bin:$PATH" npm run migrate

echo "== systemd"
cat > /etc/systemd/system/restaurant-kiosk.service <<EOF
[Unit]
Description=Restaurant Kiosk App
After=network.target postgresql.service

[Service]
User=kiosk
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$NODE_DIR/bin/node src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now restaurant-kiosk
for i in $(seq 1 15); do curl -fs "http://127.0.0.1:$PORT/healthz" && break; sleep 1; done; echo

echo "== Nginx (new site file only)"
[ -d /etc/nginx.bak-20261022 ] || cp -a /etc/nginx /etc/nginx.bak-20261022
cat > /etc/nginx/conf.d/restaurant-kiosk.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
EOF
nginx -t && systemctl reload nginx
curl -fsS -o /dev/null -w "nginx -> app via Host header: %{http_code}\n" -H "Host: $DOMAIN" http://127.0.0.1/healthz
echo "== Done (HTTPS step runs separately once DNS points here)"
