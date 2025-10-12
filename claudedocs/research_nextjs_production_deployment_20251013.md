# Next.js 15.5.3 Production Deployment Research
## Ubuntu 22.04 + Node.js + PM2 + Nginx

**Research Date**: 2025-10-13
**Confidence Level**: High (0.85)
**Sources**: Official documentation, production guides, community best practices

---

## 1. Node.js LTS Installation on Ubuntu 22.04

### Recommended Version for Next.js 15.5.3

**🎯 Node.js 20 LTS (Iron) or Node.js 22 LTS (Jod)**

- **Minimum**: Node.js 18.17.0+ (deprecated in Next.js 15.4)
- **Recommended**: Node.js 20.19.2+ or Node.js 22.16.0+
- **Rationale**: Next.js 15.4 deprecated Node.js 18 support; Node.js 20/22 ensures long-term compatibility

### Installation Method Comparison

| Method | Security | Flexibility | Production Use | Recommendation |
|--------|----------|-------------|----------------|----------------|
| **NodeSource** | ✅ High (signed packages) | Medium | ✅ Best for single version | **Recommended for production** |
| **NVM** | ✅ High (user-level) | ✅ Highest | ⚠️ Development focused | Good for multi-version needs |
| **Ubuntu APT** | ✅ Highest (official) | ❌ Lowest | ⚠️ Outdated versions | Not recommended |

### Recommended Installation: NodeSource Repository

**For Node.js 22 LTS (Latest):**

```bash
# Download and run NodeSource setup script
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js and npm
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
npm --version   # Should show v10.x.x
```

**For Node.js 20 LTS (Stable):**

```bash
# Download and run NodeSource setup script
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### Security Considerations

1. **Inspect Setup Script** (optional but recommended):
```bash
# Download script for inspection
curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh

# Review the script
less nodesource_setup.sh

# Execute after review
sudo -E bash nodesource_setup.sh
```

2. **Verify Package Signing**:
```bash
# The NodeSource repository uses GPG signed packages
# The setup script automatically adds the signing key
apt-cache policy nodejs
```

3. **Regular Updates**:
```bash
# Update Node.js to latest LTS version
sudo apt-get update
sudo apt-get upgrade nodejs
```

### Alternative: NVM for Multi-Version Management

**When to use**: Development environments, multiple projects with different Node.js versions

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 22 LTS
nvm install 22

# Set default version
nvm alias default 22

# Verify
node --version
```

---

## 2. PM2 Production Deployment Best Practices

### Installation

**Global Installation (Recommended for Production):**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Next.js Standalone Build Configuration

**next.config.js:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for optimized production builds
  output: 'standalone',

  // Optional: Optimize image handling
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
```

### Build for Production

```bash
# Install dependencies
npm ci --production=false

# Build Next.js in standalone mode
npm run build

# Install sharp for optimized image processing
npm install sharp

# Copy public and static files (standalone mode doesn't include them)
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

### PM2 Ecosystem Configuration

**ecosystem.config.js** (Recommended approach):

```javascript
module.exports = {
  apps: [
    {
      name: 'misopin-cms',

      // For standalone build
      script: '.next/standalone/server.js',

      // Alternative: Use Next.js binary
      // script: 'node_modules/next/dist/bin/next',
      // args: 'start',

      // Cluster mode for multi-core optimization
      exec_mode: 'cluster',

      // Use all available CPU cores (or specify number)
      instances: 'max',  // or -1, or specific number like 4

      // Auto-restart if memory exceeds limit
      max_memory_restart: '500M',

      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Time before force kill (milliseconds)
      kill_timeout: 5000,

      // Wait for app to be ready
      wait_ready: true,

      // Max restart attempts
      max_restarts: 10,

      // Auto-restart settings
      autorestart: true,
      watch: false,  // Set to true only in development

      // Min uptime to consider app stable
      min_uptime: '10s',

      // Restart delay
      restart_delay: 4000,
    },
  ],
}
```

### Cluster Mode vs Fork Mode

| Feature | Cluster Mode | Fork Mode |
|---------|--------------|-----------|
| **Use Case** | HTTP servers, Next.js SSR | Scripts, single-instance apps |
| **CPU Utilization** | All cores | Single core |
| **Load Balancing** | ✅ Automatic | ❌ None |
| **Zero-downtime Reload** | ✅ Yes (`pm2 reload`) | ❌ No |
| **Memory** | Higher (multiple instances) | Lower (single instance) |
| **Recommendation for Next.js** | **✅ Production** | Development only |

**Important**: Your application MUST be stateless for cluster mode:
- No in-memory sessions (use Redis/database)
- No file-based state (use shared storage)
- No singleton patterns with mutable state

### PM2 Commands

```bash
# Start application with ecosystem file
pm2 start ecosystem.config.js --env production

# Alternative: Quick start without ecosystem file
pm2 start npm --name "misopin-cms" -- start

# Cluster mode with manual configuration
pm2 start .next/standalone/server.js -i max --name misopin-cms

# Management commands
pm2 list                    # List all processes
pm2 show misopin-cms        # Show detailed info
pm2 logs misopin-cms        # View logs (real-time)
pm2 logs misopin-cms --lines 100  # View last 100 lines

# Performance monitoring
pm2 monit                   # Real-time monitoring
pm2 describe misopin-cms    # Process metadata

# Restart/reload (zero-downtime)
pm2 reload misopin-cms      # Zero-downtime reload (cluster mode)
pm2 restart misopin-cms     # Hard restart (brief downtime)

# Stop/delete
pm2 stop misopin-cms        # Stop process
pm2 delete misopin-cms      # Remove from PM2

# Save process list
pm2 save                    # Save current process list

# Update PM2
pm2 update                  # Update PM2 in-memory
```

### Log Management with PM2-Logrotate

```bash
# Install PM2 logrotate module
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 100M          # Rotate when log reaches 100MB
pm2 set pm2-logrotate:retain 30              # Keep 30 rotated files
pm2 set pm2-logrotate:compress true          # Compress rotated logs
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD  # Date format for rotated files
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # Daily at midnight

# View current configuration
pm2 conf pm2-logrotate
```

### Startup Script (Auto-start on Reboot)

```bash
# Generate startup script (run as regular user, NOT sudo)
pm2 startup

# This will output a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u <username> --hp /home/<username>
# Copy and execute that command

# Start your application
pm2 start ecosystem.config.js --env production

# Save the process list for auto-restart
pm2 save

# Verify startup script
systemctl status pm2-<username>

# Test reboot
sudo reboot
# After reboot, check if PM2 auto-started:
pm2 list
```

### PM2 Production Checklist

- [x] Use `ecosystem.config.js` for configuration
- [x] Enable cluster mode with `instances: 'max'`
- [x] Set `NODE_ENV=production`
- [x] Configure `max_memory_restart`
- [x] Install and configure `pm2-logrotate`
- [x] Set up startup script with `pm2 startup`
- [x] Use `pm2 reload` for zero-downtime deployments
- [x] Ensure application is stateless (no local data storage)
- [x] Configure proper logging paths
- [x] Test auto-restart: `pm2 save`

---

## 3. Nginx Reverse Proxy Configuration

### Installation

```bash
# Update package index
sudo apt-get update

# Install Nginx
sudo apt-get install -y nginx

# Verify installation
nginx -v

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Nginx Configuration for Next.js

**File**: `/etc/nginx/sites-available/misopin-cms`

```nginx
# Upstream definition for Next.js application
upstream nextjs_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Rate limiting zone (optional but recommended)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Cache paths for static files
proxy_cache_path /var/cache/nginx/nextjs_static
    levels=1:2
    keys_zone=STATIC:10m
    inactive=7d
    use_temp_path=off;

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name misopin.com www.misopin.com;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name misopin.com www.misopin.com;

    # SSL certificates (update paths after obtaining certificates)
    ssl_certificate /etc/letsencrypt/live/misopin.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/misopin.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Content Security Policy (customize as needed)
    # add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/rss+xml
        font/truetype
        font/opentype
        application/vnd.ms-fontobject
        image/svg+xml;

    # Max upload size
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/misopin-cms-access.log;
    error_log /var/log/nginx/misopin-cms-error.log;

    # Serve Next.js static files directly (optimal performance)
    location /_next/static/ {
        proxy_cache STATIC;
        proxy_pass http://nextjs_upstream;

        # Cache for 1 year (Next.js static files are immutable)
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Images and other static assets from public directory
    location /images/ {
        proxy_cache STATIC;
        proxy_pass http://nextjs_upstream;
        proxy_ignore_headers Cache-Control;
        proxy_cache_valid 60m;

        add_header Cache-Control "public, max-age=3600";
    }

    # API routes (with rate limiting)
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;

        # Headers for API requests
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        # Timeouts for API requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # All other requests (Next.js SSR)
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;

        # WebSocket support (for Next.js development features)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable caching for SSR pages
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache 1;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Enable Nginx Configuration

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/misopin-cms /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL/TLS Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Create directory for ACME challenge
sudo mkdir -p /var/www/certbot

# Obtain certificate (interactive)
sudo certbot --nginx -d misopin.com -d www.misopin.com

# Alternative: Non-interactive
sudo certbot certonly --webroot \
    -w /var/www/certbot \
    -d misopin.com \
    -d www.misopin.com \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email

# Test auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is set up automatically via systemd timer
sudo systemctl status certbot.timer
```

### Nginx Cache Directory Setup

```bash
# Create cache directory
sudo mkdir -p /var/cache/nginx/nextjs_static

# Set proper permissions
sudo chown -R www-data:www-data /var/cache/nginx

# Verify
ls -la /var/cache/nginx/
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload (no downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/misopin-cms-access.log
sudo tail -f /var/log/nginx/misopin-cms-error.log

# Clear cache
sudo rm -rf /var/cache/nginx/nextjs_static/*
```

---

## 4. Security Considerations & Production Hardening

### System-Level Security

#### 1. Firewall Configuration (UFW)

```bash
# Install UFW (if not already installed)
sudo apt-get install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp
# Or for custom SSH port:
# sudo ufw allow 2222/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify status
sudo ufw status verbose
```

#### 2. Fail2Ban for Brute-Force Protection

```bash
# Install Fail2Ban
sudo apt-get install -y fail2ban

# Copy default config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure for Nginx (create/edit)
sudo nano /etc/fail2ban/jail.d/nginx.conf
```

**Content for `/etc/fail2ban/jail.d/nginx.conf`:**

```ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/*error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/*error.log
maxretry = 10
findtime = 600
bantime = 3600
```

```bash
# Start and enable Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
```

#### 3. System Updates

```bash
# Update package index
sudo apt-get update

# Upgrade packages
sudo apt-get upgrade -y

# Enable automatic security updates
sudo apt-get install -y unattended-upgrades

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Node.js Security Best Practices

#### 1. Environment Variables

```bash
# Create .env.production file (never commit to git)
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
EOF

# Set proper permissions
chmod 600 .env.production
```

#### 2. Dependency Security Auditing

```bash
# Audit dependencies
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Fix including breaking changes (use carefully)
npm audit fix --force

# Generate security report
npm audit --json > security-audit.json
```

#### 3. Keep Dependencies Updated

```bash
# Check outdated packages
npm outdated

# Update to latest compatible versions
npm update

# Update to latest versions (check breaking changes)
npm install <package>@latest
```

### Next.js Security Configuration

#### 1. Security Headers in next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },

  // Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
```

#### 2. Content Security Policy

```javascript
// Add to next.config.js headers
{
  key: 'Content-Security-Policy',
  value: `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self';
    frame-ancestors 'self';
  `.replace(/\s{2,}/g, ' ').trim()
}
```

### Application-Level Security

#### 1. Rate Limiting (Next.js Middleware)

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function middleware(request: NextRequest) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxRequests = 100

  const record = rateLimit.get(ip)

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs })
  } else if (record.count >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  } else {
    record.count++
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

#### 2. Input Validation

```bash
# Install validation library
npm install zod
```

```typescript
// Example API route with validation
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)

    // Process validated data
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }
}
```

### Monitoring & Logging

#### 1. PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web-based monitoring (optional, PM2 Plus)
pm2 link <secret> <public>
```

#### 2. Nginx Log Rotation

```bash
# Nginx uses logrotate by default
# Configuration at: /etc/logrotate.d/nginx

# Verify log rotation
sudo logrotate -d /etc/logrotate.d/nginx

# Force log rotation (testing)
sudo logrotate -f /etc/logrotate.d/nginx
```

#### 3. System Resource Monitoring

```bash
# Install monitoring tools
sudo apt-get install -y htop iotop nethogs

# Monitor CPU/Memory
htop

# Monitor disk I/O
sudo iotop

# Monitor network
sudo nethogs
```

---

## 5. Complete Deployment Workflow

### Step-by-Step Deployment

#### 1. Server Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install essential build tools
sudo apt-get install -y build-essential curl git

# Create application directory
sudo mkdir -p /var/www/misopin-cms
sudo chown $USER:$USER /var/www/misopin-cms
cd /var/www/misopin-cms
```

#### 2. Install Node.js

```bash
# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

#### 3. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Install PM2 logrotate
pm2 install pm2-logrotate

# Configure logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

#### 4. Clone and Build Application

```bash
# Clone repository
git clone <your-repo-url> .

# Or deploy files via rsync, scp, etc.

# Install dependencies
npm ci --production=false

# Create .env.production
nano .env.production
# Add production environment variables

# Build application
npm run build

# Install sharp for image optimization
npm install sharp

# Copy static files for standalone mode
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

#### 5. Configure PM2

```bash
# Create ecosystem.config.js (use example from section 2)
nano ecosystem.config.js

# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
# Execute the command it outputs (with sudo)

# Verify
pm2 list
pm2 logs
```

#### 6. Install and Configure Nginx

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/misopin-cms
# Use configuration from section 3

# Enable site
sudo ln -s /etc/nginx/sites-available/misopin-cms /etc/nginx/sites-enabled/

# Create cache directory
sudo mkdir -p /var/cache/nginx/nextjs_static
sudo chown -R www-data:www-data /var/cache/nginx

# Test configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 7. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Create ACME challenge directory
sudo mkdir -p /var/www/certbot

# Obtain certificate
sudo certbot --nginx -d misopin.com -d www.misopin.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

#### 8. Configure Firewall

```bash
# Install and configure UFW
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

#### 9. Install Security Tools

```bash
# Install Fail2Ban
sudo apt-get install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Enable automatic updates
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

#### 10. Verify Deployment

```bash
# Check PM2 status
pm2 list
pm2 logs misopin-cms --lines 50

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Test application
curl -I http://localhost:3000
curl -I https://misopin.com

# Check SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=misopin.com
```

---

## 6. Maintenance & Updates

### Application Updates

```bash
# Navigate to application directory
cd /var/www/misopin-cms

# Pull latest changes
git pull origin main

# Install new dependencies
npm ci --production=false

# Rebuild application
npm run build

# Copy static files
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Reload PM2 (zero-downtime)
pm2 reload ecosystem.config.js --env production

# Or restart if needed
pm2 restart misopin-cms

# Verify
pm2 logs misopin-cms --lines 20
```

### System Maintenance

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Update Node.js (if new LTS version available)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Update PM2
sudo npm install -g pm2@latest
pm2 update

# Update Nginx
sudo apt-get install --only-upgrade nginx
sudo systemctl reload nginx

# Renew SSL certificates (automatic, but can be forced)
sudo certbot renew
```

### Monitoring Checklist

```bash
# Daily checks
pm2 list                              # Check process status
pm2 logs --lines 100                  # Review recent logs
sudo tail -f /var/log/nginx/misopin-cms-error.log  # Check Nginx errors

# Weekly checks
df -h                                 # Check disk space
free -h                               # Check memory usage
sudo ufw status                       # Verify firewall
sudo fail2ban-client status           # Check fail2ban

# Monthly checks
npm audit                             # Security audit
sudo certbot renew --dry-run          # Test SSL renewal
sudo apt-get update && sudo apt-get upgrade  # System updates
```

---

## 7. Troubleshooting

### Common Issues

#### PM2 Won't Start After Reboot

```bash
# Check PM2 startup status
systemctl status pm2-<username>

# Regenerate startup script
pm2 unstartup
pm2 startup
# Execute the sudo command it outputs
pm2 save
```

#### Nginx 502 Bad Gateway

```bash
# Check if Next.js is running
pm2 list
pm2 logs misopin-cms

# Check Nginx error logs
sudo tail -f /var/log/nginx/misopin-cms-error.log

# Verify Next.js is listening on port 3000
sudo netstat -tlnp | grep 3000

# Restart services
pm2 restart misopin-cms
sudo systemctl restart nginx
```

#### High Memory Usage

```bash
# Check PM2 memory usage
pm2 list

# Restart processes exceeding memory limit
pm2 restart misopin-cms

# Adjust max_memory_restart in ecosystem.config.js
# Then reload configuration
pm2 reload ecosystem.config.js
```

#### SSL Certificate Issues

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check certificate expiration
sudo certbot certificates
```

---

## 8. Performance Optimization

### Enable HTTP/2 in Nginx

Already enabled in configuration: `listen 443 ssl http2;`

### Enable Brotli Compression (Optional)

```bash
# Install Brotli module
sudo apt-get install -y nginx-module-brotli

# Add to /etc/nginx/nginx.conf (in http block)
# load_module modules/ngx_http_brotli_filter_module.so;
# load_module modules/ngx_http_brotli_static_module.so;

# Configure in server block
# brotli on;
# brotli_comp_level 6;
# brotli_types text/plain text/css application/json application/javascript;
```

### Database Connection Pooling

For PostgreSQL with Prisma (if using):

```javascript
// prisma/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### CDN Integration (Optional)

For serving static assets via CDN, update `next.config.js`:

```javascript
const nextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://cdn.misopin.com'
    : '',
}
```

---

## 9. Backup Strategy

### Application Backup

```bash
# Create backup script
cat > /usr/local/bin/backup-misopin.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/misopin-cms"
APP_DIR="/var/www/misopin-cms"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR .

# Backup database (example for PostgreSQL)
# pg_dump -U dbuser dbname > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app_*.tar.gz" -mtime +7 -delete
# find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make executable
sudo chmod +x /usr/local/bin/backup-misopin.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-misopin.sh") | crontab -
```

---

## 10. Quick Reference Commands

### Essential Commands Quick Reference

```bash
# Node.js
node --version                        # Check Node.js version
npm --version                         # Check npm version

# PM2
pm2 list                              # List all processes
pm2 start ecosystem.config.js         # Start with config
pm2 reload misopin-cms                # Zero-downtime reload
pm2 restart misopin-cms               # Restart process
pm2 stop misopin-cms                  # Stop process
pm2 delete misopin-cms                # Remove process
pm2 logs misopin-cms                  # View logs
pm2 monit                             # Monitor resources
pm2 save                              # Save process list
pm2 startup                           # Generate startup script

# Nginx
sudo nginx -t                         # Test configuration
sudo systemctl reload nginx           # Reload configuration
sudo systemctl restart nginx          # Restart Nginx
sudo systemctl status nginx           # Check status
sudo tail -f /var/log/nginx/misopin-cms-access.log  # View access logs
sudo tail -f /var/log/nginx/misopin-cms-error.log   # View error logs

# SSL/Certbot
sudo certbot certificates             # List certificates
sudo certbot renew                    # Renew certificates
sudo certbot renew --dry-run          # Test renewal

# System
sudo ufw status                       # Firewall status
sudo fail2ban-client status           # Fail2Ban status
df -h                                 # Disk usage
free -h                               # Memory usage
htop                                  # Process monitor
sudo systemctl status pm2-<user>      # PM2 service status
```

---

## Sources & References

### Official Documentation
- Next.js 15 Documentation: https://nextjs.org/docs
- Node.js Documentation: https://nodejs.org/en/docs/
- PM2 Documentation: https://pm2.keymetrics.io/docs/
- Nginx Documentation: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/docs/

### Community Resources
- NodeSource Repository: https://github.com/nodesource/distributions
- PM2 GitHub: https://github.com/Unitech/pm2
- Next.js GitHub: https://github.com/vercel/next.js

### Security Resources
- Node.js Security Best Practices: https://nodejs.org/en/learn/getting-started/security-best-practices
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/

---

## Revision History

- **2025-10-13**: Initial research compilation
  - Node.js 22 LTS recommended for Next.js 15.5.3
  - PM2 cluster mode configuration for production
  - Nginx reverse proxy with security headers
  - Complete deployment workflow
  - Security hardening checklist

---

**End of Research Document**
