# Deployment Command Log

Important commands executed for the Restaurant Kiosk deployment, in order. Secrets are never written here.

## A. Laptop (Windows): code preparation, 2026-10-22

```bash
# Inspect repo state: local work was uncommitted, and GitHub had 3 README-only commits
git fetch origin
git log --oneline origin/main -5

# Commit local work (.env stops being tracked; propt.txt stays local) and merge GitHub commits
git add -A
git reset propt.txt
git commit -m "Prepare kiosk app for production deployment"
git merge --no-edit origin/main            # -> a89a348

# PENDING (run by you): publish the code so the VM can clone it
git push origin main
```

## B. Laptop: OCI CLI and keys

```powershell
# OCI CLI in an isolated Python venv (no admin rights needed)
py -3.11 -m venv "$env:USERPROFILE\oci-cli-venv"
& "$env:USERPROFILE\oci-cli-venv\Scripts\python.exe" -m pip install --upgrade pip oci-cli
& "$env:USERPROFILE\oci-cli-venv\Scripts\oci.exe" --version
```

```bash
# New SSH key for the VM (the original key is lost)
ssh-keygen -t ed25519 -N "" -C "oci-vm-rishi" -f ~/.ssh/oci_vm_ed25519

# API signing key for the OCI CLI (public half is pasted into the OCI Console → My profile → API keys)
openssl genrsa -out ~/.oci/oci_api_key.pem 2048
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
```

## C. OCI CLI: discover the VM and recover SSH (Bastion)

Facts found: VM **payflow**, Ubuntu 24.04 aarch64, 2 OCPU / 12 GB, region ap-mumbai-1,
public IP **130.210.59.24**, private IP 10.0.0.158. The security list already allows 22/80/443.

```bash
# ~/.oci/config = Console "Configuration file preview" + key_file=~/.oci/oci_api_key.pem
export OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING=True SUPPRESS_LABEL_WARNING=True
OCI=~/oci-cli-venv/Scripts/oci.exe
C=<tenancy OCID>   I=<instance OCID>   SUB=<subnet OCID>

# Find the VM
$OCI search resource structured-search --query-text "query instance resources where lifecycleState = 'RUNNING'"
$OCI compute instance get --instance-id $I
$OCI compute instance list-vnics --instance-id $I          # public/private IP + subnet
$OCI compute image get --image-id <source image OCID>     # -> Canonical Ubuntu 24.04
$OCI instance-agent plugin list --instanceagent-id $I --compartment-id $C

# Enable the Bastion plugin (full plugin list re-sent; only Bastion changed DISABLED -> ENABLED)
$OCI compute instance update --instance-id $I --agent-config file://agent.json --force

# Check subnet ingress rules
$OCI network security-list get --security-list-id <subnet's security list>

# Temporary Bastion, reachable only from the laptop's public IP
$OCI bastion bastion create --bastion-type standard --name kioskbastion --compartment-id $C \
  --target-subnet-id $SUB --client-cidr-list '["<laptop public IP>/32"]' --max-session-ttl 10800 \
  --wait-for-state SUCCEEDED
```

```bash
# (waited ~7 min for the Bastion plugin to report RUNNING)
$OCI instance-agent plugin get --instanceagent-id $I --compartment-id $C --plugin-name Bastion

# Managed SSH session as 'ubuntu' using the new key
$OCI bastion session create-managed-ssh --bastion-id <bastion OCID> --display-name kiosk-setup \
  --target-resource-id $I --target-os-username ubuntu --target-private-ip 10.0.0.158 --target-port 22 \
  --ssh-public-key-file ~/.ssh/oci_vm_ed25519.pub --session-ttl 10800 --wait-for-state SUCCEEDED

# Connect through the bastion
ssh -i ~/.ssh/oci_vm_ed25519 \
  -o ProxyCommand="ssh -i ~/.ssh/oci_vm_ed25519 -W %h:%p -p 22 <session OCID>@host.bastion.ap-mumbai-1.oci.oraclecloud.com" \
  ubuntu@10.0.0.158

# On the VM: make the key permanent. authorized_keys2 is used because the Bastion agent
# removes its own lines from authorized_keys when the session ends.
echo "<contents of oci_vm_ed25519.pub>" >> ~/.ssh/authorized_keys2 && chmod 600 ~/.ssh/authorized_keys2

# From now on, direct SSH (no bastion):
ssh -i ~/.ssh/oci_vm_ed25519 ubuntu@130.210.59.24

# Clean-up: delete session and bastion, set plugin back to DISABLED
$OCI bastion session delete --session-id <session OCID> --force
$OCI bastion bastion delete --bastion-id <bastion OCID> --force
$OCI compute instance update --instance-id $I --agent-config file://agent.json --force   # Bastion -> DISABLED
```

## D. VM: deployment

What was already on the VM (read-only `deploy/inspect.sh`): **PayFlow** (Docker: payment, admin, bank,
ledger, Kafka, Oracle DB) behind Nginx at payflow-demo.duckdns.org, config in `/etc/nginx/conf.d/payflow.conf`,
ports 8081/8084 on localhost. No Node, no PostgreSQL. Certbot present. 6.7 GB RAM available.

```bash
# Read-only inspection
ssh -i ~/.ssh/oci_vm_ed25519 ubuntu@130.210.59.24 'bash -s' < deploy/inspect.sh

# Full setup (idempotent): apt packages (git, build-essential, postgresql, python3-certbot-nginx),
# Node 22 tarball verified by SHA-256 into /opt/node-22, 'kiosk' system user, git clone into
# /opt/restaurant-kiosk-app, PostgreSQL role kiosk_app + db restaurent_kiosk (random password in
# /root/.kiosk_db_pass), .env with random SECRET_KEY, npm ci --omit=dev, npm run seed (first time only),
# npm run migrate, systemd unit restaurant-kiosk, Nginx /etc/nginx/conf.d/restaurant-kiosk.conf,
# backup /etc/nginx.bak-20261022, nginx -t, reload
scp -i ~/.ssh/oci_vm_ed25519 deploy/setup.sh ubuntu@130.210.59.24:/tmp/kiosk-setup.sh
ssh -i ~/.ssh/oci_vm_ed25519 ubuntu@130.210.59.24 'sudo bash /tmp/kiosk-setup.sh dinegrid.duckdns.org'

# HTTPS (Let's Encrypt; adds a 443 block + HTTP->HTTPS redirect to the kiosk file only)
sudo certbot --nginx -d dinegrid.duckdns.org --non-interactive --agree-tos --redirect
```

## E. Verification (all passed, 2026-10-22)

| Check | Result |
|---|---|
| PayFlow `https://payflow-demo.duckdns.org/` before / after | 200 / 200 |
| `http://dinegrid.duckdns.org/` | 301 → https |
| `https://dinegrid.duckdns.org/` | 302 → /login |
| `/healthz` | `{"status":"ok"}` |
| Socket.IO polling handshake | 200 |
| Admin login (`role=admin`) | 302 → /admin, `token` cookie `Secure`; /admin = 200 |
| Certificate | CN dinegrid.duckdns.org, expires 2027-01-19 (auto-renew via certbot timer) |
| Memory used by kiosk Node + PostgreSQL | ~200 MB; 6.6 GB still available |

## F. Day-two commands

```bash
ssh -i ~/.ssh/oci_vm_ed25519 ubuntu@130.210.59.24
sudo -u kiosk /opt/restaurant-kiosk-app/deploy/update.sh && sudo systemctl restart restaurant-kiosk   # deploy new code
journalctl -u restaurant-kiosk -f                                                                     # logs
sudo nano /opt/restaurant-kiosk-app/.env && sudo systemctl restart restaurant-kiosk                   # add Razorpay keys
```
