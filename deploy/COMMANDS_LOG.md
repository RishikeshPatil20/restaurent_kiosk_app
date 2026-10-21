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

_(appended as executed)_

## D. VM: deployment

_(appended as executed)_
