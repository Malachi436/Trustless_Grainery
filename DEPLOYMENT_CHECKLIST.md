# 🚀 Deployment Checklist - Trustless Granary

## Pre-Deployment Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

**New packages added:**
- ✅ `express-rate-limit` - API rate limiting
- ✅ `compression` - Response compression

### 2. Database Setup (Supabase)

#### Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Copy PostgreSQL connection string
4. Update `.env.production` with connection details

#### Run All Migrations
```bash
# Ensure all migrations are applied
npm run migrate
npm run migrate:v2
npm run migrate:multi-owner
npm run migrate:field-agent

# Run enum fixes
npx ts-node src/database/add-service-types.ts
npx ts-node src/database/fix-batch-source-type.ts
```

**Note:** Supabase automatically handles:
- ✅ Database backups (daily)
- ✅ Connection pooling (PgBouncer)
- ✅ Performance indexes (check Supabase dashboard)
- ✅ SSL connections (enabled by default)

### 3. Environment Configuration

#### Generate Strong JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Create Production .env
```bash
cp .env.production.example .env.production
# Edit .env.production with your values
```

**Required values:**
- `DATABASE_URL` - From Supabase dashboard
- `JWT_SECRET` - Generated above
- `CORS_ORIGIN` - Your frontend domain(s)
- `AWS_ACCESS_KEY_ID` - For S3 file storage (optional)
- `AWS_SECRET_ACCESS_KEY` - For S3 file storage (optional)

### 4. Build Backend
```bash
cd backend
npm run build
```

Verify `dist/` directory is created with compiled JavaScript.

---

## PM2 Deployment

### Install PM2
```bash
npm install -g pm2
```

### Start Application
```bash
cd backend
pm2 start ecosystem.config.js --env production
```

### Setup Auto-Start on Server Reboot
```bash
pm2 startup
# Follow the command it outputs
pm2 save
```

### Monitor
```bash
pm2 status
pm2 logs trustless-backend
pm2 monit
```

### Useful PM2 Commands
```bash
pm2 restart trustless-backend  # Zero-downtime restart
pm2 stop trustless-backend     # Stop application
pm2 delete trustless-backend   # Remove from PM2
pm2 flush trustless-backend    # Clear logs
```

---

## Frontend Builds

### Mobile App (Expo)

#### Android
```bash
cd frontend
eas build --platform android --profile production
```

#### iOS
```bash
cd frontend
eas build --platform ios --profile production
```

#### Update API Endpoint
```typescript
// frontend/src/lib/api-config.ts
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:4000/api'
  : 'https://api.yourdomain.com/api'; // Update this
```

### Owner Dashboard (Next.js)

```bash
cd owner-dashboard
npm run build
```

Deploy to:
- Vercel (recommended)
- Netlify
- Your own server with nginx

---

## Verification Tests

### 1. Health Check
```bash
curl https://api.yourdomain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "responseTime": "15ms"
  }
}
```

### 2. Rate Limiting Test
```bash
# Try 6 login attempts rapidly
for i in {1..6}; do
  curl -X POST https://api.yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone":"123","pin":"456","role":"OWNER"}'
done
```

6th attempt should return `429 Too Many Requests`

### 3. Compression Test
```bash
curl -H "Accept-Encoding: gzip" -I https://api.yourdomain.com/api/owner/dashboard
```

Should see `Content-Encoding: gzip` header

### 4. SSL Certificate
```bash
curl -I https://api.yourdomain.com
```

Should NOT show certificate errors

---

## Post-Deployment Monitoring

### Daily Checks
- [ ] Check PM2 status: `pm2 status`
- [ ] Review error logs: `pm2 logs trustless-backend --err --lines 50`
- [ ] Check Supabase dashboard for database health
- [ ] Test health endpoint: `curl https://api.yourdomain.com/health`

### Weekly Checks
- [ ] Review Supabase backup status
- [ ] Check disk space: `df -h`
- [ ] Review PM2 metrics: `pm2 monit`
- [ ] Update dependencies if needed: `npm outdated`

---

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
pm2 logs trustless-backend --err --lines 100

# Common issues:
# 1. Database connection failed → Check .env.production
# 2. Port already in use → Check PORT in .env
# 3. Missing dependencies → Run npm install
```

### High Memory Usage
```bash
# Check current memory
pm2 list

# Restart if needed
pm2 restart trustless-backend

# If persists, reduce instances
pm2 scale trustless-backend 2  # Use only 2 cores
```

### Database Connection Issues
1. Check Supabase project status
2. Verify connection pooler is enabled (PgBouncer)
3. Check firewall rules allow your server IP
4. Test connection:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

---

## Rollback Plan

### If Deployment Fails

1. **Stop PM2:**
```bash
pm2 stop trustless-backend
```

2. **Restore Previous Version:**
```bash
git checkout <previous-commit>
npm install
npm run build
pm2 restart trustless-backend
```

3. **Database Rollback (if needed):**
```bash
# Restore from Supabase backup
# Go to Supabase Dashboard → Settings → Backups
```

---

## Security Checklist

- [ ] Strong JWT secret generated (64+ characters)
- [ ] CORS limited to specific domains (not *)
- [ ] Rate limiting enabled on all routes
- [ ] SSL certificate installed and valid
- [ ] Database uses SSL connections (Supabase default)
- [ ] Environment variables not committed to Git
- [ ] API keys rotated after setup
- [ ] Firewall rules configured (only 80/443 open)

---

## Performance Checklist

- [ ] PM2 cluster mode enabled (using all CPU cores)
- [ ] Compression enabled for responses
- [ ] Database connection pooling configured
- [ ] Supabase indexes created for common queries
- [ ] Log level set to 'error' in production
- [ ] Static assets served with caching headers

---

## Completed Deployment Features

✅ **Connection Pooling** - Configured (max 20 connections)  
✅ **Health Check Endpoint** - `/health` and `/ready`  
✅ **Rate Limiting** - General (100/15min), Auth (5/15min)  
✅ **Response Compression** - Gzip enabled  
✅ **PM2 Configuration** - Cluster mode with auto-restart  
✅ **Graceful Shutdown** - SIGTERM/SIGINT handlers  
✅ **Structured Logging** - Winston with file output  
✅ **Security Headers** - Helmet middleware  
✅ **Production .env Template** - Ready for Supabase  

---

## Next Steps (Optional Enhancements)

- [ ] Set up Sentry error tracking
- [ ] Configure Cloudflare for DDoS protection
- [ ] Add Redis for session management
- [ ] Implement automated load testing (Artillery)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure monitoring dashboard (PM2 Plus)

---

**Estimated Deployment Time:** 2-3 hours  
**Recommended Server:** 2 CPU cores, 4GB RAM minimum

For questions or issues, refer to the logs:
- Backend: `backend/logs/error.log`
- PM2: `~/.pm2/logs/`
- Supabase: Dashboard → Logs section
