# Deployment Strategy Analysis - Next.js CMS to one-q.xyz

## Executive Summary

This document provides a systematic analysis of deploying the Next.js 15 CMS application to production server 141.164.60.51 (one-q.xyz domain). The analysis follows a structured approach to identify architecture components, dependencies, risks, and mitigation strategies.

---

## 1. Architecture Analysis

### 1.1 Application Components

**Frontend Layer**
- Next.js 15 with App Router (React 19.1.0)
- TypeScript-based application
- Server-side rendering (SSR) capabilities
- Static asset optimization with Sharp
- TailwindCSS 4 for styling
- Shadcn UI component library

**Backend Layer**
- Next.js API Routes (serverless functions)
- JWT-based authentication (jsonwebtoken)
- PostgreSQL database via Prisma ORM (v6.16.2)
- SSL-enabled database connections
- bcryptjs for password hashing

**Database Layer**
- PostgreSQL with SSL
- Prisma ORM for schema management
- Connection pooling required for production

**File System Integration**
- HTML file management in `/var/www/Misopin-renew`
- Image uploads with WebP conversion (Sharp)
- Static file serving

### 1.2 Infrastructure Requirements

**Server Components**
1. **Node.js Runtime**
   - Version: 20.x LTS (required for Next.js 15)
   - Process manager: PM2 for stability and auto-restart

2. **Reverse Proxy**
   - Nginx for request routing
   - SSL/TLS termination
   - Static file serving optimization
   - Request buffering and caching

3. **Database**
   - PostgreSQL server (already configured)
   - SSL certificates for secure connection
   - Connection string with SSL parameters

4. **File System Permissions**
   - Read/write access to `/var/www/Misopin-renew`
   - Upload directory for CMS assets
   - Log directory for application logs

### 1.3 Network Architecture

```
Internet → Nginx (Port 80/443) → Next.js App (Port 3000) → PostgreSQL (SSL)
                ↓
         /var/www/Misopin-renew (HTML Files)
```

---

## 2. Dependency Analysis

### 2.1 Critical Dependencies

**Build-time Dependencies**
- Node.js 20.x LTS
- pnpm or npm package manager
- Build tools for native modules (Sharp, bcrypt)
- TypeScript compiler

**Runtime Dependencies**
- PostgreSQL client libraries
- SSL certificates for database connection
- Environment variables configuration
- File system access permissions

**External Service Dependencies**
- Domain DNS configuration (one-q.xyz → 141.164.60.51)
- SSL certificates for HTTPS (Let's Encrypt recommended)

### 2.2 Dependency Chain

```
1. Server Access → 2. Node.js Installation → 3. Code Deployment
   ↓
4. Environment Configuration → 5. Dependency Installation → 6. Database Migration
   ↓
7. Application Build → 8. PM2 Setup → 9. Nginx Configuration
   ↓
10. SSL Certificate → 11. Domain Configuration → 12. Testing
```

### 2.3 Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Authentication
JWT_SECRET=<secure-random-string>
NEXTAUTH_SECRET=<secure-random-string>
NEXTAUTH_URL=https://one-q.xyz

# Application
NODE_ENV=production
NEXT_PUBLIC_STATIC_SITE_URL=https://one-q.xyz

# Optional: Supabase (if used)
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
```

---

## 3. Risk Analysis

### 3.1 High-Risk Areas (🚨 Critical)

**Risk 1: Database Connection Failures**
- **Impact**: Application cannot start or function
- **Probability**: Medium
- **Causes**:
  - Incorrect SSL configuration
  - Network firewall blocking PostgreSQL port
  - Invalid credentials or connection string
- **Mitigation**:
  - Test database connection before deployment
  - Verify SSL certificates and modes
  - Create health check endpoint (`/api/health`)
  - Implement connection retry logic

**Risk 2: File System Permissions**
- **Impact**: Cannot manage HTML files in `/var/www/Misopin-renew`
- **Probability**: High
- **Causes**:
  - Node.js process running under wrong user
  - Insufficient permissions on target directory
- **Mitigation**:
  - Set correct ownership: `chown -R node-user:node-user /var/www/Misopin-renew`
  - Test file operations before production
  - Implement proper error handling for file operations

**Risk 3: Build Failures**
- **Impact**: Cannot deploy application
- **Probability**: Medium
- **Causes**:
  - Native module compilation failures (Sharp, bcrypt)
  - TypeScript errors
  - Missing dependencies
- **Mitigation**:
  - Test build process locally with production settings
  - Install build tools: `apt-get install build-essential python3`
  - Use exact dependency versions (package-lock.json)

### 3.2 Medium-Risk Areas (⚠️ Important)

**Risk 4: Port Conflicts**
- **Impact**: Application cannot bind to port 3000
- **Probability**: Low
- **Mitigation**:
  - Check port availability: `netstat -tuln | grep 3000`
  - Configure alternative port if needed
  - Use PM2 to manage port allocation

**Risk 5: Memory Constraints**
- **Impact**: Application crashes under load
- **Probability**: Medium
- **Mitigation**:
  - Monitor server memory: `free -h`
  - Configure PM2 max memory restart
  - Implement proper garbage collection

**Risk 6: SSL Certificate Issues**
- **Impact**: HTTPS not working, browser warnings
- **Probability**: Medium
- **Mitigation**:
  - Use Certbot for Let's Encrypt
  - Test certificate renewal process
  - Set up auto-renewal cron job

### 3.3 Low-Risk Areas (✓ Manageable)

**Risk 7: Nginx Configuration Errors**
- **Impact**: Routing issues, performance degradation
- **Probability**: Low
- **Mitigation**:
  - Test configuration: `nginx -t`
  - Keep backup of working config
  - Use proven configuration templates

**Risk 8: DNS Propagation Delays**
- **Impact**: Temporary unavailability during DNS updates
- **Probability**: Low (expected)
- **Mitigation**:
  - Perform DNS changes during low-traffic periods
  - Lower TTL before changes
  - Verify propagation before announcing

---

## 4. Critical Path Items

### Phase 1: Pre-Deployment Preparation (2-3 hours)

**Priority: 🔴 CRITICAL**

1. **Server Access Verification**
   - [ ] SSH access to 141.164.60.51 confirmed
   - [ ] Root or sudo privileges available
   - [ ] Firewall rules documented

2. **Database Connection Testing**
   - [ ] Database credentials verified
   - [ ] SSL connection tested from server
   - [ ] Connection string validated
   - [ ] Database migrations reviewed

3. **Environment Preparation**
   - [ ] Node.js 20.x installed
   - [ ] PM2 globally installed
   - [ ] Nginx installed and configured
   - [ ] Build tools installed

4. **Application Audit**
   - [ ] Local build successful
   - [ ] All tests passing
   - [ ] TypeScript compilation clean
   - [ ] Environment variables documented

### Phase 2: Initial Deployment (3-4 hours)

**Priority: 🔴 CRITICAL**

5. **Code Deployment**
   - [ ] Git repository cloned to `/opt/misopin-cms` or `/var/www/misopin-cms`
   - [ ] Dependencies installed: `npm install --production`
   - [ ] Environment variables configured in `.env.production`

6. **Database Setup**
   - [ ] Prisma migrations applied: `npx prisma migrate deploy`
   - [ ] Database seed data loaded (if needed)
   - [ ] Database connection verified from application

7. **Build Process**
   - [ ] Production build completed: `npm run build`
   - [ ] Build artifacts validated in `.next` directory
   - [ ] Static assets optimized

8. **File System Configuration**
   - [ ] `/var/www/Misopin-renew` permissions set
   - [ ] Test file creation/deletion operations
   - [ ] Upload directory created and configured

### Phase 3: Process Management (1-2 hours)

**Priority: 🟡 IMPORTANT**

9. **PM2 Configuration**
   - [ ] PM2 ecosystem file created
   - [ ] Application started with PM2
   - [ ] Auto-restart on crash enabled
   - [ ] PM2 startup script configured
   - [ ] Logs configured and tested

10. **Application Health Check**
    - [ ] Application responding on localhost:3000
    - [ ] Health endpoint returning 200
    - [ ] Database queries working
    - [ ] File operations verified

### Phase 4: Reverse Proxy Setup (2-3 hours)

**Priority: 🟡 IMPORTANT**

11. **Nginx Configuration**
    - [ ] Virtual host configuration created
    - [ ] Proxy pass to localhost:3000 configured
    - [ ] Static file serving optimized
    - [ ] Request buffering configured
    - [ ] Nginx configuration tested: `nginx -t`
    - [ ] Nginx reloaded: `systemctl reload nginx`

12. **SSL Certificate Installation**
    - [ ] Certbot installed
    - [ ] SSL certificate obtained for one-q.xyz
    - [ ] HTTPS redirect configured
    - [ ] Certificate auto-renewal enabled

### Phase 5: Domain & DNS (1-2 hours)

**Priority: 🟡 IMPORTANT**

13. **DNS Configuration**
    - [ ] A record: one-q.xyz → 141.164.60.51
    - [ ] DNS propagation verified
    - [ ] Domain accessible via browser

### Phase 6: Testing & Validation (2-3 hours)

**Priority: 🔴 CRITICAL**

14. **Functional Testing**
    - [ ] Admin login working
    - [ ] Page management functional
    - [ ] HTML file operations successful
    - [ ] Image uploads working
    - [ ] Database operations verified

15. **Performance Testing**
    - [ ] Page load times acceptable (<3s)
    - [ ] Memory usage stable
    - [ ] No memory leaks detected
    - [ ] Database connection pool functioning

16. **Security Validation**
    - [ ] HTTPS enforced
    - [ ] Security headers configured
    - [ ] File permissions verified
    - [ ] Database credentials secure

### Phase 7: Monitoring & Documentation (1-2 hours)

**Priority: 🟢 RECOMMENDED**

17. **Monitoring Setup**
    - [ ] PM2 monitoring active
    - [ ] Log rotation configured
    - [ ] Error alerting setup (optional)
    - [ ] Uptime monitoring (optional)

18. **Documentation**
    - [ ] Deployment process documented
    - [ ] Credentials stored securely
    - [ ] Rollback procedure documented
    - [ ] Maintenance runbook created

---

## 5. Detailed Deployment Sequence

### Step-by-Step Deployment Plan

#### **Step 1: Server Preparation**

```bash
# SSH into server
ssh root@141.164.60.51

# Update system packages
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install build tools
apt-get install -y build-essential python3 git

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt-get install -y nginx

# Verify installations
node --version  # Should be 20.x
npm --version
pm2 --version
nginx -v
```

#### **Step 2: Database Connection Verification**

```bash
# Install PostgreSQL client (for testing)
apt-get install -y postgresql-client

# Test database connection with SSL
psql "postgresql://user:password@host:port/database?sslmode=require"

# If successful, exit with \q
```

#### **Step 3: Application Deployment**

```bash
# Create application directory
mkdir -p /opt/misopin-cms
cd /opt/misopin-cms

# Clone repository (replace with your repo URL)
git clone <repository-url> .

# Or upload via SCP/SFTP if not using git
# scp -r ./local-app/* root@141.164.60.51:/opt/misopin-cms/

# Install dependencies
npm install --production

# Create environment file
cat > .env.production << 'EOF'
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
JWT_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://one-q.xyz
NODE_ENV=production
NEXT_PUBLIC_STATIC_SITE_URL=https://one-q.xyz
EOF

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build

# Test build output
ls -la .next/
```

#### **Step 4: File System Permissions**

```bash
# Create Node.js user (if doesn't exist)
useradd -r -s /bin/bash nodejs

# Set ownership of application
chown -R nodejs:nodejs /opt/misopin-cms

# Set permissions on HTML directory
chown -R nodejs:nodejs /var/www/Misopin-renew
chmod -R 755 /var/www/Misopin-renew

# Create uploads directory
mkdir -p /opt/misopin-cms/public/uploads
chown -R nodejs:nodejs /opt/misopin-cms/public/uploads

# Test write permissions
su - nodejs -c "touch /var/www/Misopin-renew/test.txt && rm /var/www/Misopin-renew/test.txt"
```

#### **Step 5: PM2 Configuration**

```bash
# Create PM2 ecosystem file
cat > /opt/misopin-cms/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'misopin-cms',
    script: 'npm',
    args: 'start',
    cwd: '/opt/misopin-cms',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/misopin-cms-error.log',
    out_file: '/var/log/pm2/misopin-cms-out.log',
    log_file: '/var/log/pm2/misopin-cms-combined.log',
    time: true
  }]
};
EOF

# Create log directory
mkdir -p /var/log/pm2
chown -R nodejs:nodejs /var/log/pm2

# Start application with PM2
cd /opt/misopin-cms
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u nodejs --hp /home/nodejs

# Monitor application
pm2 status
pm2 logs misopin-cms --lines 50
```

#### **Step 6: Application Health Verification**

```bash
# Test local connection
curl http://localhost:3000/api/health

# Expected response: {"status":"ok",...}

# Test database connection
curl http://localhost:3000/api/debug/db

# Check application logs
pm2 logs misopin-cms --lines 100
```

#### **Step 7: Nginx Configuration**

```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/one-q.xyz << 'EOF'
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name one-q.xyz www.one-q.xyz;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name one-q.xyz www.one-q.xyz;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/one-q.xyz/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/one-q.xyz/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/one-q.xyz-access.log;
    error_log /var/log/nginx/one-q.xyz-error.log;

    # Client upload size
    client_max_body_size 50M;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files optimization
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Create letsencrypt directory
mkdir -p /var/www/letsencrypt

# Enable site
ln -s /etc/nginx/sites-available/one-q.xyz /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

#### **Step 8: SSL Certificate Installation**

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d one-q.xyz -d www.one-q.xyz --email admin@one-q.xyz --agree-tos --non-interactive

# Test certificate renewal
certbot renew --dry-run

# Setup auto-renewal cron
cat > /etc/cron.d/certbot-renew << 'EOF'
0 3 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
```

#### **Step 9: DNS Configuration**

```bash
# Configure A record (at DNS provider):
# one-q.xyz → 141.164.60.51
# www.one-q.xyz → 141.164.60.51

# Wait for DNS propagation (check with):
dig one-q.xyz +short
# Should return: 141.164.60.51
```

#### **Step 10: Final Testing**

```bash
# Test HTTPS access
curl -I https://one-q.xyz

# Test application endpoints
curl https://one-q.xyz/api/health

# Monitor logs
tail -f /var/log/nginx/one-q.xyz-access.log
pm2 logs misopin-cms

# Performance test
ab -n 100 -c 10 https://one-q.xyz/
```

---

## 6. Rollback Strategy

### Immediate Rollback (Emergency)

**Scenario**: Critical failure preventing application operation

**Steps**:
```bash
# Stop PM2 application
pm2 stop misopin-cms

# Disable Nginx site
rm /etc/nginx/sites-enabled/one-q.xyz
nginx -t && systemctl reload nginx

# Restore previous version (if using git)
cd /opt/misopin-cms
git checkout <previous-commit>
npm install --production
npm run build
pm2 restart misopin-cms

# Or restore from backup
tar -xzf /backup/misopin-cms-backup.tar.gz -C /opt/
pm2 restart misopin-cms
```

### Partial Rollback

**Scenario**: Specific component failure

**Database Rollback**:
```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore database from backup
psql "postgresql://..." < /backup/database-backup.sql
```

**Configuration Rollback**:
```bash
# Restore previous environment
cp /backup/.env.production /opt/misopin-cms/.env.production
pm2 restart misopin-cms
```

### Backup Requirements

**Before Deployment**:
1. Database backup: `pg_dump "postgresql://..." > backup.sql`
2. Application backup: `tar -czf misopin-cms-backup.tar.gz /opt/misopin-cms`
3. Nginx config backup: `cp /etc/nginx/sites-available/one-q.xyz /backup/`
4. Environment backup: `cp .env.production /backup/`

---

## 7. Monitoring & Maintenance

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs in real-time
pm2 logs misopin-cms --lines 100 --timestamp

# Check process status
pm2 status

# View process details
pm2 info misopin-cms
```

### Server Monitoring

```bash
# Monitor disk usage
df -h

# Monitor memory usage
free -h

# Monitor CPU usage
top

# Monitor network connections
netstat -tuln

# Check application port
lsof -i :3000
```

### Log Management

```bash
# Nginx logs
tail -f /var/log/nginx/one-q.xyz-access.log
tail -f /var/log/nginx/one-q.xyz-error.log

# Application logs
tail -f /var/log/pm2/misopin-cms-error.log
tail -f /var/log/pm2/misopin-cms-out.log

# Setup log rotation
cat > /etc/logrotate.d/misopin-cms << 'EOF'
/var/log/pm2/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### Health Checks

```bash
# Create health check script
cat > /opt/misopin-cms/health-check.sh << 'EOF'
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $RESPONSE -eq 200 ]; then
    echo "OK: Application is healthy"
    exit 0
else
    echo "ERROR: Application returned $RESPONSE"
    pm2 restart misopin-cms
    exit 1
fi
EOF

chmod +x /opt/misopin-cms/health-check.sh

# Setup cron for health checks
cat > /etc/cron.d/misopin-health << 'EOF'
*/5 * * * * root /opt/misopin-cms/health-check.sh >> /var/log/health-check.log 2>&1
EOF
```

---

## 8. Security Hardening

### Server Security

```bash
# Update firewall rules
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable

# Disable password authentication (use SSH keys)
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Install fail2ban
apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### Application Security

```bash
# Set secure file permissions
chmod 600 /opt/misopin-cms/.env.production
chmod 700 /opt/misopin-cms

# Disable directory listing in Nginx
# (already configured in Nginx config above)

# Setup rate limiting in Nginx
cat >> /etc/nginx/sites-available/one-q.xyz << 'EOF'

# Rate limiting
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

# Apply to login endpoint
location /api/auth/login {
    limit_req zone=login burst=3 nodelay;
    proxy_pass http://localhost:3000;
}

# Apply to API endpoints
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3000;
}
EOF

nginx -t && systemctl reload nginx
```

### Database Security

- Ensure PostgreSQL only accepts SSL connections
- Use strong passwords (minimum 32 characters)
- Limit database user permissions to required operations only
- Enable PostgreSQL logging for security audits

---

## 9. Performance Optimization

### Nginx Optimization

```nginx
# Add to http block in /etc/nginx/nginx.conf

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

# Browser caching
map $sent_http_content_type $expires {
    default                    off;
    text/html                  epoch;
    text/css                   max;
    application/javascript     max;
    ~image/                    max;
}
expires $expires;
```

### PM2 Optimization

```javascript
// Update ecosystem.config.js for clustering
module.exports = {
  apps: [{
    name: 'misopin-cms',
    script: 'npm',
    args: 'start',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G',
    // ... rest of config
  }]
};
```

### Database Optimization

```bash
# Configure connection pooling in .env.production
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require&connection_limit=10&pool_timeout=20"
```

---

## 10. Post-Deployment Checklist

### Immediate (Within 1 hour)

- [ ] Application accessible at https://one-q.xyz
- [ ] Admin login functional
- [ ] Database queries working correctly
- [ ] File operations in `/var/www/Misopin-renew` successful
- [ ] Image uploads functioning
- [ ] Logs being written correctly
- [ ] PM2 auto-restart working
- [ ] HTTPS certificate valid

### Short-term (Within 24 hours)

- [ ] Monitor error logs for issues
- [ ] Test all major CMS features
- [ ] Verify page load performance (<3s)
- [ ] Check memory usage trends
- [ ] Test backup/restore process
- [ ] Document any deployment issues encountered
- [ ] Update DNS TTL to normal values

### Medium-term (Within 1 week)

- [ ] Monitor application stability
- [ ] Review security logs
- [ ] Optimize database queries if needed
- [ ] Setup monitoring/alerting (optional)
- [ ] Train team on deployment process
- [ ] Create runbook for common issues
- [ ] Test rollback procedure

---

## 11. Common Issues & Troubleshooting

### Issue 1: Application Won't Start

**Symptoms**: PM2 shows stopped status, logs show errors

**Diagnosis**:
```bash
pm2 logs misopin-cms --err --lines 100
```

**Common Causes**:
1. Database connection failure → Check DATABASE_URL, SSL config
2. Port already in use → `lsof -i :3000` and kill conflicting process
3. Missing environment variables → Verify `.env.production`
4. Build artifacts missing → Run `npm run build` again

### Issue 2: Database Connection Errors

**Symptoms**: "Error connecting to database" in logs

**Diagnosis**:
```bash
psql "postgresql://..." # Test connection manually
```

**Solutions**:
1. Verify SSL mode: `?sslmode=require`
2. Check firewall: PostgreSQL port accessible
3. Validate credentials
4. Test from application server

### Issue 3: File Permission Errors

**Symptoms**: Cannot create/modify HTML files

**Diagnosis**:
```bash
ls -la /var/www/Misopin-renew
ps aux | grep node  # Check which user runs Node.js
```

**Solutions**:
```bash
chown -R nodejs:nodejs /var/www/Misopin-renew
chmod -R 755 /var/www/Misopin-renew
```

### Issue 4: Nginx 502 Bad Gateway

**Symptoms**: Browser shows "502 Bad Gateway"

**Diagnosis**:
```bash
systemctl status nginx
pm2 status
curl http://localhost:3000/api/health
```

**Common Causes**:
1. Application not running → Start with PM2
2. Wrong port in Nginx config → Verify proxy_pass
3. Firewall blocking localhost → Check iptables/ufw

### Issue 5: SSL Certificate Issues

**Symptoms**: Browser shows "Not Secure" or certificate errors

**Diagnosis**:
```bash
certbot certificates
openssl s_client -connect one-q.xyz:443
```

**Solutions**:
```bash
certbot renew --force-renewal
systemctl reload nginx
```

---

## 12. Key Architectural Decisions

### Decision 1: PM2 for Process Management
**Rationale**:
- Auto-restart on crashes
- Built-in clustering for multi-core
- Log management
- Production monitoring
- Zero-downtime reloads

**Alternative Considered**: systemd service
**Why Rejected**: Less feature-rich, harder to manage Node.js-specific needs

### Decision 2: Nginx as Reverse Proxy
**Rationale**:
- SSL termination
- Static file serving performance
- Request buffering and caching
- Load balancing capability
- Industry standard for Node.js deployments

**Alternative Considered**: Direct Node.js exposure
**Why Rejected**: Security concerns, limited caching, no SSL termination

### Decision 3: Let's Encrypt for SSL
**Rationale**:
- Free automated certificate management
- Auto-renewal support
- Trusted by all browsers
- Simple Certbot integration

**Alternative Considered**: Commercial SSL certificate
**Why Rejected**: Unnecessary cost, manual renewal overhead

### Decision 4: PostgreSQL with SSL
**Rationale**:
- Data security in transit
- Production-grade requirement
- Already configured on server

**Alternative Considered**: Non-SSL connection
**Why Rejected**: Security vulnerability, best practice violation

### Decision 5: File System for HTML Management
**Rationale**:
- Direct requirement to manage `/var/www/Misopin-renew`
- Simple file operations
- No external storage needed

**Alternative Considered**: S3/Cloud storage
**Why Rejected**: Unnecessary complexity, latency concerns, cost

---

## 13. Success Criteria

### Technical Success Metrics

✅ **Application Availability**
- Uptime > 99.5%
- Response time < 3 seconds (per PRD requirement)
- Zero data loss during deployment

✅ **Functional Completeness**
- All CMS features operational
- Database operations successful
- File management working
- Authentication functional

✅ **Security Standards**
- HTTPS enforced
- Database connections encrypted
- Proper file permissions
- Security headers configured

✅ **Operational Readiness**
- Monitoring in place
- Logs accessible
- Backup procedure tested
- Rollback procedure validated

### Business Success Metrics

✅ **User Experience**
- Admin can login and manage content
- Page updates reflect immediately
- No errors during normal operations

✅ **Reliability**
- Application auto-recovers from crashes
- Database connections stable
- No manual intervention needed for normal operations

---

## 14. Timeline Estimate

**Total Estimated Time**: 12-18 hours (including testing and troubleshooting)

| Phase | Duration | Critical Path |
|-------|----------|---------------|
| Pre-deployment preparation | 2-3 hours | Yes |
| Initial deployment | 3-4 hours | Yes |
| Process management setup | 1-2 hours | Yes |
| Reverse proxy configuration | 2-3 hours | Yes |
| DNS & SSL setup | 1-2 hours | Yes |
| Testing & validation | 2-3 hours | Yes |
| Monitoring & documentation | 1-2 hours | No |

**Recommended Deployment Window**:
- Off-peak hours (early morning or weekend)
- Allow 4-hour buffer for unexpected issues
- Have rollback plan ready

---

## 15. Conclusion

This deployment strategy provides a comprehensive, systematic approach to deploying the Next.js 15 CMS to production. Key success factors:

1. **Thorough preparation** - Database, environment, permissions verified upfront
2. **Systematic execution** - Step-by-step process with validation gates
3. **Risk mitigation** - Identified risks with concrete mitigation strategies
4. **Rollback readiness** - Clear procedure for emergency recovery
5. **Operational excellence** - Monitoring, logging, and maintenance procedures

**Next Steps**:
1. Review this analysis with team
2. Schedule deployment window
3. Create pre-deployment backup
4. Execute deployment following this plan
5. Monitor and document actual deployment experience
6. Update this document with lessons learned

**Critical Success Factors**:
- Database SSL connection working
- File system permissions correct
- PM2 process management stable
- Nginx configuration optimized
- SSL certificates properly configured
- Comprehensive testing before go-live

---

**Document Version**: 1.0
**Last Updated**: 2025-10-13
**Prepared By**: Claude (Deployment Analysis)
**Status**: Ready for Review
