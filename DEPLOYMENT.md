# Deploying The Parliament (Oracle Cloud — free tier)

This deploys the whole stack — **Next.js app + PostgreSQL + Caddy (auto-HTTPS)** —
on a single Oracle Cloud "Always Free" ARM VM at **₹0/month**, with your Hostinger
domain pointing at it. The same `Dockerfile` / compose files work on any VPS
(Hostinger, DigitalOcean, etc.) too.

## What you need
1. **Oracle Cloud account** (free) — https://www.oracle.com/cloud/free/
2. **Your domain** (you have this on Hostinger).
3. ~30 minutes.

---

## 1. Create the free VM

1. Oracle Cloud Console → **Compute → Instances → Create instance**.
2. **Image:** Ubuntu 22.04. **Shape:** `VM.Standard.A1.Flex` (Ampere ARM) — the
   Always-Free shape. 2 OCPU / 12 GB RAM is plenty (you can go up to 4/24 free).
   *If you see "out of capacity", try a different Availability Domain or region
   (Mumbai / Hyderabad), or retry later — free ARM capacity comes and goes.*
3. **Add your SSH key** (paste your public key) so you can log in.
4. **Networking:** create/assign a VCN with a public IP. Note the **public IP**.
5. After it boots, open the firewall for web traffic:
   - In the VCN **Security List / Network Security Group**, add **Ingress** rules
     allowing TCP **80** and **443** from `0.0.0.0/0`.
   - Then on the VM itself (Oracle images block ports by default):
     ```bash
     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
     sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
     sudo netfilter-persistent save
     ```

## 2. Point your domain at the VM (Hostinger)

In **Hostinger → Domains → DNS / Nameservers**, add two **A records** to the VM's
public IP:

| Type | Name | Value          |
|------|------|----------------|
| A    | `@`  | `<VM public IP>` |
| A    | `www`| `<VM public IP>` |

DNS can take a few minutes to a few hours. Caddy needs this working before it can
issue the HTTPS certificate.

## 3. Install Docker on the VM

SSH in (`ssh ubuntu@<VM public IP>`), then:
```bash
sudo apt-get update && sudo apt-get install -y git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
```

## 4. Get the code + configure

```bash
git clone https://github.com/bookasloth/the-parliament.git
cd the-parliament
git checkout claude/whats-missing-94riz8   # or main once merged

cp .env.example .env
nano .env
```
Set at minimum in `.env`:
```
DOMAIN="your-domain.org"
AUTH_URL="https://your-domain.org"
AUTH_SECRET="<paste output of: openssl rand -base64 32>"
POSTGRES_PASSWORD="<a strong password>"
ADMIN_EMAILS="you@example.com"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="<your admin login password>"
SEED_ON_START="true"      # first deploy only
```
> Leave `DATABASE_URL` as-is — the production compose file overrides it to point
> at the bundled database container automatically.

## 5. Launch

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```
On first boot the app container runs migrations, seeds reference data, creates
your admin, then starts. Watch progress with:
```bash
docker compose -f docker/docker-compose.prod.yml logs -f app
```

Visit **https://your-domain.org** — Caddy will have fetched a valid HTTPS cert.
Log in at `/auth/signin` with your `ADMIN_EMAIL` / `ADMIN_PASSWORD` and open
`/admin`.

**After the first successful deploy**, set `SEED_ON_START="false"` in `.env` and
`docker compose -f docker/docker-compose.prod.yml up -d` again.

---

## Updating later
```bash
git pull
docker compose -f docker/docker-compose.prod.yml up -d --build
```

## Database backups (do this before real users)
```bash
docker exec parliament-db pg_dump -U postgres the_parliament > backup-$(date +%F).sql
```
Schedule it with `cron` and copy the dump to Cloudflare R2 for off-box safety.

## Notes / limitations
- Member pages (feed, directory, groups, events) currently render **mock data** —
  this deploy is a working staging site; wire those to the DB before public launch.
- File uploads (avatars, verification docs) need **Cloudflare R2** creds in `.env`
  (`R2_*`) — optional until you test uploads.
- Email is **optional** for now (signup auto-verifies); add SMTP/Resend creds when
  you want real verification/notification emails.
