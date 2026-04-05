# Deploying Immuno on Linux (Nginx, PHP-FPM, Laravel, Certbot)

This document describes deploying the **Immuno** platform to a Linux server. The repository has two deployable parts:

| Component | Path | Runtime |
|-----------|------|---------|
| **API** | `api/` | PHP 8.2+ (Laravel 12), PHP-FPM, Nginx |
| **Web app** | repository root | Node.js (Next.js 16) — build with `npm run build`, run with `next start` (often behind Nginx as a reverse proxy) |

Examples below assume **Ubuntu 22.04 or 24.04** and a single server. Adjust paths, domains, and package names for your distribution.

---

## 1. Prerequisites

- A server with SSH access and sudo.
- DNS **A/AAAA** records pointing your domains to the server (for TLS).
- **PostgreSQL** or **MySQL** for production (the API `.env.example` documents PostgreSQL; SQLite is fine only for local dev).

---

## 2. Install system packages

```bash
sudo apt update && sudo apt install -y \
  nginx \
  certbot python3-certbot-nginx \
  git unzip \
  php8.3-fpm php8.3-cli php8.3-common php8.3-curl php8.3-mbstring php8.3-xml \
  php8.3-zip php8.3-bcmath php8.3-intl php8.3-readline \
  php8.3-pgsql php8.3-mysql \
  composer \
  postgresql postgresql-contrib
```

Use **PHP 8.2** packages (`php8.2-*`) if you prefer to match `composer.json` (`"php": "^8.2"`) exactly; 8.3 is compatible.

Optional: **Node.js 22 LTS** for the Next.js app (using [NodeSource](https://github.com/nodesource/distributions) or your preferred method):

```bash
# Example: NodeSource Node.js 22.x (verify current install steps on their README)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 3. Database (production)

Create a database and user (PostgreSQL example):

```bash
sudo -u postgres psql -c "CREATE USER immuno WITH PASSWORD 'your_strong_password';"
sudo -u postgres psql -c "CREATE DATABASE immuno OWNER immuno;"
```

Note the credentials for `api/.env` (`DB_*`).

---

## 4. Deploy the Laravel API (`api/`)

### 4.1 Code layout

Place the app on the server (example):

```text
/var/www/immuno/          # git clone root (contains api/ and Next.js app)
/var/www/immuno/api/      # Laravel root
```

```bash
sudo mkdir -p /var/www
sudo chown -R "$USER":"$USER" /var/www
cd /var/www
git clone <your-repo-url> immuno
cd immuno/api
```

### 4.2 Composer and environment

```bash
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Edit `api/.env` for production. Critical settings:

| Variable | Notes |
|----------|--------|
| `APP_ENV=production` | |
| `APP_DEBUG=false` | |
| `APP_URL=https://api.yourdomain.com` | Must match the public URL Nginx serves (affects generated `/storage` URLs, etc.) |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | Production database |
| `SESSION_DRIVER=database` | Matches default migrations (sessions table) |
| `QUEUE_CONNECTION=database` | Requires a **queue worker** (see below) |
| `CACHE_STORE=database` | Uses cache table migrations |
| `SANCTUM_STATEFUL_DOMAINS` | Comma-separated hosts for the Next.js origin, e.g. `app.yourdomain.com` (no `https://`) |

### 4.3 Permissions and storage

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo find storage bootstrap/cache -type d -exec chmod 775 {} \;
sudo find storage bootstrap/cache -type f -exec chmod 664 {} \;
php artisan storage:link
```

### 4.4 Production migrations

Run migrations **once per deploy** when the app is configured and the database is empty or in sync:

```bash
cd /var/www/immuno/api
php artisan migrate --force
```

- `--force` is required when `APP_ENV=production`.
- The project’s migrations live in `api/database/migrations/` and include Laravel defaults (users, cache, jobs, Sanctum tokens, Spatie permission tables) plus domain tables (facilities, vaccines, immunizations, reminders, etc.). There is no separate “prod-only” migration set: **production uses the same migrations as development**; only the database and `.env` differ.
- Optional: `php artisan db:seed --force` only if you intentionally use seeders in production (not required for a typical live install).

After first deploy, also run:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 5. PHP-FPM

The default pool is often `www.conf`. Ensure (or add) settings compatible with Laravel, for example:

```ini
; /etc/php/8.3/fpm/pool.d/www.conf (snippet)
user = www-data
group = www-data
listen = /run/php/php8.3-fpm.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 50
```

Restart after changes:

```bash
sudo systemctl restart php8.3-fpm
```

---

## 6. Nginx: Laravel API

Point the API server block at Laravel’s `public` directory and forward PHP to the FPM socket.

Example: **`/etc/nginx/sites-available/immuno-api`** (replace `api.yourdomain.com` and PHP version/socket):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /var/www/immuno/api/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/immuno-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. TLS with Certbot (Let’s Encrypt)

After HTTP works on port 80:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot will adjust the Nginx server block for HTTPS and set up renewal (`certbot renew` is usually installed as a timer). Use the same flow for the **frontend** hostname (e.g. `app.yourdomain.com`) once that server block exists.

---

## 8. Queue worker (required for `QUEUE_CONNECTION=database`)

Laravel will not process queued jobs until a worker runs. Example **systemd** unit `/etc/systemd/system/immuno-queue.service`:

```ini
[Unit]
Description=Immuno Laravel queue worker
After=network.target

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/immuno/api/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
WorkingDirectory=/var/www/immuno/api

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now immuno-queue
```

If you add scheduled tasks later, run the scheduler from cron:

```cron
* * * * * www-data cd /var/www/immuno/api && php artisan schedule:run >> /dev/null 2>&1
```

---

## 9. Next.js frontend (same or another host)

Build from the repository root:

```bash
cd /var/www/immuno
npm ci
npm run build
```

Set **`NEXT_PUBLIC_LARAVEL_API_URL`** to your public API base (must match how the browser calls the API), for example:

```bash
# .env.production (or environment for your process manager)
NEXT_PUBLIC_API_PROVIDER=laravel
NEXT_PUBLIC_LARAVEL_API_URL=https://api.yourdomain.com/api/v1
```

Run:

```bash
npm run start
# default port 3000; put Nginx in front with proxy_pass to 127.0.0.1:3000
```

Example minimal Nginx `location` for the app:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Run `next start` under **systemd** or **PM2** so it restarts on reboot. Then obtain a certificate for `app.yourdomain.com` with Certbot as in section 7.

Ensure **CORS / Sanctum**: the browser origin must appear in `SANCTUM_STATEFUL_DOMAINS` if you use cookie-based SPA auth; `APP_URL` on the API must be the HTTPS API URL.

---

## 10. Deploy checklist (production)

1. `APP_DEBUG=false`, `APP_ENV=production`, strong `APP_KEY`, secure database credentials.
2. `php artisan migrate --force` after API env is correct.
3. `php artisan storage:link`; writable `storage/` and `bootstrap/cache/`.
4. `config:cache`, `route:cache`, `view:cache`.
5. Queue worker running if jobs are used.
6. Nginx + PHP-FPM serving `api/public` over HTTPS.
7. Next.js `NEXT_PUBLIC_LARAVEL_API_URL` points to `https://api.../api/v1`.
8. Firewall: allow 80/443 (and SSH only from trusted IPs if possible).

---

## 11. Updating the application

```bash
cd /var/www/immuno
git pull
cd api && composer install --no-dev --optimize-autoloader && php artisan migrate --force && php artisan config:cache && php artisan route:cache
sudo systemctl restart immuno-queue php8.3-fpm
cd .. && npm ci && npm run build && sudo systemctl restart immuno-next   # if you use a unit for Next.js
```

Adjust service names to match your setup.

---

## 12. Health check

Laravel registers a health route at **`GET /up`** (see `bootstrap/app.php`). After TLS is configured:

```bash
curl -fsS https://api.yourdomain.com/up
```

You should get a successful HTTP response from the application.
