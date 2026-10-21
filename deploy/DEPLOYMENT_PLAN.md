# Restaurant Kiosk App: Deployment Plan (Oracle Cloud Always Free)

Last updated: 2026-10-22 · Target: ~60 minutes end to end · Cost: ₹0 / $0

> **Status: DEPLOYED ✅** at https://dinegrid.duckdns.org (VM `payflow`, 130.210.59.24, Ubuntu 24.04 ARM).
> The existing PayFlow site (https://payflow-demo.duckdns.org) was verified unaffected.
> Differences from the plan below: the Nginx file is `/etc/nginx/conf.d/restaurant-kiosk.conf`, because PayFlow uses `conf.d`.
> The permanent SSH key is in `~/.ssh/authorized_keys2`. The reproducible scripts are `deploy/inspect.sh` and `deploy/setup.sh`.
> See `COMMANDS_LOG.md` for every command and the verification results.

## 1. Verdict: can both websites share the VM?

**Yes, comfortably.**

| Resource | VM has | Existing site (est.) | Kiosk app needs | Headroom |
|---|---|---|---|---|
| RAM | 12 GB | < 1 GB typical | Node ~150 MB + PostgreSQL ~150 MB | > 10 GB free |
| CPU | VM.Standard.A1.Flex (ARM64) | idle (demo) | idle (demo) | plenty |
| Disk | boot volume (≥ 47 GB) | — | app + node_modules + DB < 1 GB | plenty |
| Ports 80/443 | Nginx (existing) | shared via `server_name` | shared via `server_name` | no conflict |

The only real risks are **configuration collisions**, not capacity. The plan avoids each one:

| Possible collision | How the plan avoids it |
|---|---|
| App port | The kiosk app runs on **127.0.0.1:5100** (not public, and not the common 3000/5000). We check that it's free with `ss -ltnp` first. |
| Node.js version | Node 22 goes into its own folder, **/opt/node-22**, and only the kiosk service uses it. The system Node, NVM and PM2 used by the existing site are untouched. |
| Nginx | We **add one new file** for `kiosk-<name>.duckdns.org`. The existing site's config isn't edited. Before any change we back up `/etc/nginx`, run `nginx -t`, then reload (not restart). |
| PostgreSQL | If PostgreSQL already exists we only add a new database and a new user. Otherwise we install it, listening on localhost only. |
| HTTPS certs | `certbot --nginx -d <kiosk domain>` touches only the kiosk server block. |
| Firewall | Nothing new is opened. 80/443 are already open for the existing site, and 5100 stays private. |

ARM64 note: Node 22, PostgreSQL and the native `bcrypt` module all support linux-arm64. The plan installs `build-essential` / `gcc-c++` as a fallback in case `bcrypt` has to compile.

## 2. Target architecture

```
Browser ──HTTPS──► Nginx :443 (existing)
                    ├─ server_name <existing-domain>        → existing website (unchanged)
                    └─ server_name kiosk-<name>.duckdns.org → 127.0.0.1:5100
                                                                │  (HTTP + WebSocket upgrade for Socket.IO)
                                                                ▼
                                                  systemd: restaurant-kiosk.service
                                                  /opt/node-22/bin/node src/server.js
                                                  user: kiosk   dir: /opt/restaurant-kiosk-app
                                                                │
                                                                ▼
                                                  PostgreSQL (localhost:5432)
                                                  db: restaurent_kiosk  user: kiosk_app
```

## 3. Free-tier fit (everything is ₹0)

| Component | Free because |
|---|---|
| VM (A1.Flex, 12 GB) | Already exists. Always Free allows 4 OCPU / 24 GB total across A1 VMs. |
| OCI Bastion (temporary, to recover SSH) | The OCI Bastion service has no charge. We delete it after use. |
| Domain | DuckDNS subdomain (free) |
| HTTPS | Let's Encrypt via certbot (free, auto-renews) |
| Database | Self-hosted PostgreSQL on the same VM (no paid managed DB) |
| Payments | Razorpay **Test Mode** (free; with empty keys the app uses simulated payments) |
| Outbound traffic | 10 TB/month free; a demo uses almost none |

## 4. Step-by-step plan with time budget

| # | Step | Who | Est. |
|---|---|---|---|
| 0 | Commit local code and merge GitHub README commits | Claude ✅ done | — |
| 0b | **Push to GitHub** (`git push origin main`) | **You** | 1 min |
| 1 | Install OCI CLI on the laptop (Python venv) | Claude ✅ | 5 min |
| 2 | **Add API key in OCI Console**, send config snippet | **You** | 3 min |
| 3 | Configure CLI, find VM (OCID, OS image, public IP, subnet) | Claude | 3 min |
| 4 | Recover SSH access: enable Bastion plugin → create Bastion → managed SSH session → add new permanent key | Claude | 10–15 min (plugin start-up is the slow part) |
| 5 | **Create DuckDNS subdomain and point it at the VM IP** | **You** | 3 min |
| 6 | Read-only inspection of VM (OS, Nginx layout, ports, Node, PostgreSQL, certbot) | Claude | 3 min |
| 7 | Install Node 22 (isolated), PostgreSQL (if missing), certbot (if missing) | Claude | 5 min |
| 8 | Create `kiosk` user, clone repo, write `.env`, `npm ci`, seed + migrate | Claude | 5 min |
| 9 | systemd service and health check on 127.0.0.1:5100 | Claude | 2 min |
| 10 | Nginx server block (with WebSocket support), `nginx -t`, reload | Claude | 3 min |
| 11 | HTTPS via certbot, verify both sites | Claude | 3 min |
| 12 | Delete Bastion, write final command log | Claude | 2 min |
| 13 | **Optional:** Razorpay test keys and webhook URL, change demo passwords | **You** | 5 min |

## 5. Manual steps for you (details)

### M1. Push the code (1 command)
The commit is ready locally (`a89a348`), but pushing was blocked for me. In the project folder, run:
```powershell
git push origin main
```

### M2. Add an API key so the OCI CLI can act for you
1. OCI Console → top-right **Profile** icon → **My profile** → **API keys** → **Add API key**.
2. Pick **Paste a public key**, then paste the contents of `C:\Users\Rishi\.oci\oci_api_key_public.pem`.
3. Click **Add**. A **Configuration file preview** appears. Copy it and send it to Claude. It contains only OCIDs, a fingerprint and the region, no secrets.

### M3. DuckDNS (free domain)
1. Go to https://www.duckdns.org and sign in with GitHub or Google.
2. Add a subdomain, e.g. `rishi-kiosk` (gives `rishi-kiosk.duckdns.org`).
3. In **current ip**, enter the VM's **public IP** (Claude prints it in step 3), then click **update ip**.
4. Send Claude the full subdomain. Sending the token is optional; it's used for a cron job that keeps the IP in sync.
5. Check it: `nslookup rishi-kiosk.duckdns.org` should return the VM IP.

### M4. Rotate secrets that were exposed on GitHub ⚠️
The **first commit on public GitHub contains a `.env` file**. The new commit stops tracking it, but **git history still has it**. Treat every value in it as leaked:
- **Razorpay**: Dashboard → Account & Settings → API Keys → **Regenerate** (the test keys at least).
- **PhonePe** merchant keys (if real): rotate them in the PhonePe dashboard.
- `SECRET_KEY` / DB password: the server gets **new** random values automatically.
- Optional full clean-up: rewrite history with `git filter-repo --path .env --invert-paths` and force-push. This isn't needed if you rotate the keys.

### M5. After go-live (optional)
- Razorpay test keys: send them so they go into the server `.env`. If you skip this, payments are simulated.
- Razorpay webhook: Dashboard → Webhooks → URL `https://<kiosk domain>/api/payments/webhook`, and send the webhook secret.
- Change the seeded demo passwords (`admin@example.com` / `staff@example.com` / `kiosk@example.com`, all `password123`).

## 6. Server configuration reference

### `.env` on the server (`/opt/restaurant-kiosk-app/.env`, mode 600)
```
PORT=5100
NODE_ENV=production
SECRET_KEY=<64 random hex chars, generated on server>
BUSINESS_TIMEZONE=Asia/Kolkata
CORS_ORIGIN=
DB_HOST=localhost
DB_PORT=5432
DATABASE_NAME=restaurent_kiosk
USER_NAME=kiosk_app
PASSWORD=<random, generated on server>
RAZORPAY_KEY_ID=            # empty = simulated payments
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```
`NODE_ENV=production` makes the login cookie `Secure`, so **HTTPS is required** for login to work. That's why we set up DuckDNS and certbot.

### systemd unit (`/etc/systemd/system/restaurant-kiosk.service`)
```ini
[Unit]
Description=Restaurant Kiosk App
After=network.target postgresql.service

[Service]
User=kiosk
WorkingDirectory=/opt/restaurant-kiosk-app
EnvironmentFile=/opt/restaurant-kiosk-app/.env
ExecStart=/opt/node-22/bin/node src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Nginx server block
```nginx
server {
    listen 80;
    server_name kiosk-<name>.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:5100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;      # Socket.IO (kitchen dashboard)
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```
Ubuntu: `/etc/nginx/sites-available/restaurant-kiosk` symlinked into `sites-enabled`. Oracle Linux: `/etc/nginx/conf.d/restaurant-kiosk.conf`.
Oracle Linux only: run `sudo setsebool -P httpd_can_network_connect 1` so SELinux lets Nginx proxy to 5100. If the existing site is already a reverse proxy, this is already set.

### Database initialisation order
1. `npm run seed`: creates every table from the current models and inserts the demo menu and users. It **drops** the kiosk tables, so run it only on first deploy.
2. `npm run migrate`: records and applies the migrations (each one is safe to re-run).

## 7. Future updates (one command)
After pushing new code to GitHub, run on the VM:
```bash
sudo -u kiosk /opt/restaurant-kiosk-app/deploy/update.sh && sudo systemctl restart restaurant-kiosk
```
`update.sh` runs `git pull`, `npm ci --omit=dev` and `npm run migrate`.

## 8. Rollback and safety
- Before touching Nginx: `sudo cp -a /etc/nginx /etc/nginx.bak-20261022`.
- To remove the kiosk site completely: `sudo systemctl disable --now restaurant-kiosk`, delete the kiosk Nginx file, then `sudo nginx -t && sudo systemctl reload nginx`. The existing site is never affected.
- Health checks: `curl -s http://127.0.0.1:5100/healthz` (app), `journalctl -u restaurant-kiosk -f` (logs).

## 9. Fallbacks if SSH recovery via Bastion fails
1. **Cloud Shell check:** if you once SSH'd from OCI Cloud Shell, the old key may still be in Cloud Shell's `~/.ssh`.
2. **Serial console (maintenance boot):** Console → Instance → **Console connection** → Launch Cloud Shell connection, then boot into maintenance mode and add the key. This reboots the VM, so the existing site is down for about 5 minutes.
