#!/usr/bin/env bash
# Prompts for Razorpay keys, writes them into the server .env and restarts the app.
# Installed on the VM as /usr/local/bin/kiosk-set-razorpay. Run:  sudo kiosk-set-razorpay
set -euo pipefail

ENV_FILE=/opt/restaurant-kiosk-app/.env
trim() { printf '%s' "$1" | tr -d '[:space:]'; }

for attempt in 1 2 3; do
  read -rp "RAZORPAY_KEY_ID (rzp_test_...): " KEY_ID
  read -rsp "RAZORPAY_KEY_SECRET (hidden; paste with right-click or Ctrl+Shift+V): " KEY_SECRET; echo
  KEY_ID=$(trim "$KEY_ID"); KEY_SECRET=$(trim "$KEY_SECRET")
  echo "Secret received: ${#KEY_SECRET} characters (Razorpay secrets are usually 24)"

  if [[ ! $KEY_ID =~ ^rzp_(test|live)_[A-Za-z0-9]+$ ]]; then
    echo "Key id must look like rzp_test_..."; continue
  fi
  if [ -z "$KEY_SECRET" ]; then
    echo "Secret is empty, so the paste didn't go through."; continue
  fi

  # Check the pair with Razorpay before saving (401 = id and secret don't belong together)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "$KEY_ID:$KEY_SECRET" "https://api.razorpay.com/v1/orders?count=1")
  [ "$CODE" = 200 ] && break
  echo "Razorpay rejected this id/secret pair (HTTP $CODE). Try again ($attempt/3)."
  [ "$attempt" = 3 ] && { echo "Nothing changed."; exit 1; }
done

read -rsp "RAZORPAY_WEBHOOK_SECRET (hidden, Enter to skip): " WEBHOOK_SECRET; echo
WEBHOOK_SECRET=$(trim "$WEBHOOK_SECRET")

set_var() { sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; }
set_var RAZORPAY_KEY_ID "$KEY_ID"
set_var RAZORPAY_KEY_SECRET "$KEY_SECRET"
[ -z "$WEBHOOK_SECRET" ] || set_var RAZORPAY_WEBHOOK_SECRET "$WEBHOOK_SECRET"

systemctl restart restaurant-kiosk
sleep 3
curl -fs http://127.0.0.1:5100/healthz >/dev/null && echo "Keys verified, saved, and app restarted. Try checkout again."
