# 🚀 Real Estate Investor Platform - Production Deployment Checklist

## Pre-Deployment

- [x] Code committed to Git
- [x] Pushed to GitHub (main branch)
- [x] Deployment scripts created
- [ ] AWS CLI installed and configured
- [ ] Vercel CLI ready

## Step 1: Deploy Application to Vercel

```bash
./deploy-to-vercel.sh
```

- [ ] Vercel project created
- [ ] Initial deployment successful
- [ ] Deployment URL obtained: `https://_____.vercel.app`

## Step 2: Configure Environment Variables

### Vercel Dashboard → Settings → Environment Variables

**Required Variables:**

- [ ] `NEXTAUTH_URL` = Your Vercel deployment URL
- [ ] `NEXTAUTH_SECRET` = Run: `openssl rand -base64 32`
- [ ] `DATABASE_URL` = (Add after Step 3)

**Optional - Property Data:**

- [ ] `BRIGHT_DATA_API_TOKEN` = `b773aaf2-a632-459f-b217-5d38368db5f6`
- [ ] `BRIGHT_DATA_DATASET_ID` = `gd_lwh4f6i08oqu8aw1q5`

**Optional - AI Features:**

- [ ] `OPENAI_API_KEY` = Your OpenAI API key

## Step 3: Set Up AWS RDS PostgreSQL

```bash
aws configure  # If not already configured
./setup-aws-rds.sh
```

- [ ] AWS credentials configured
- [ ] RDS instance created (db.t4g.micro)
- [ ] Security group configured
- [ ] Database endpoint obtained
- [ ] DATABASE_URL saved to .env.production

## Step 4: Prepare Production Database

```bash
./prepare-production-db.sh
```

- [ ] Prisma schema updated to PostgreSQL
- [ ] Database migrations run successfully
- [ ] All tables created in production database

## Step 5: Add DATABASE_URL to Vercel

- [ ] Copy DATABASE_URL from .env.production
- [ ] Add to Vercel Environment Variables
- [ ] Redeploy application in Vercel dashboard

## Step 6: Verify Deployment

Test these features on your live site:

- [ ] Home page loads
- [ ] User registration works
- [ ] User login works
- [ ] Property search (city/state) works
- [ ] Property search (ZIP code) works
- [ ] Property search (GPS location) works
- [ ] Property details page loads
- [ ] CMA report generates (if OpenAI key added)
- [ ] Crime score displays
- [ ] Tenant management page loads
- [ ] Billing dashboard loads

## Step 7: Security Hardening

- [ ] Update RDS security group to restrict access (not 0.0.0.0/0)
- [ ] Enable AWS RDS encryption at rest (already enabled by script)
- [ ] Enable AWS RDS automated backups (already enabled by script)
- [ ] Review and rotate API keys if needed
- [ ] Set up monitoring alerts

## Step 8: Optional Enhancements

- [ ] Add custom domain in Vercel
- [ ] Set up AWS S3 for file uploads (property photos)
- [ ] Set up AWS SES for email notifications
- [ ] Configure CDN for property images
- [ ] Set up monitoring (Vercel Analytics, AWS CloudWatch)

## Cost Monitoring

### Initial Monthly Costs (~$15-35):
- Vercel: FREE (hobby) or $20 (pro with custom domain)
- AWS RDS db.t4g.micro: ~$12/month
- AWS Data Transfer: ~$3/month

### Monitor AWS Costs:
```bash
aws ce get-cost-and-usage \
    --time-period Start=2025-01-01,End=2025-01-31 \
    --granularity MONTHLY \
    --metrics "BlendedCost"
```

## Rollback Plan

If something goes wrong:

```bash
# Rollback Vercel deployment
vercel rollback

# Or redeploy previous commit
git revert HEAD
git push origin main
# Vercel auto-deploys
```

## Support & Monitoring

### View Logs:
```bash
# Vercel logs
vercel logs

# AWS RDS logs
aws rds describe-db-log-files \
    --db-instance-identifier realestate-investor-db
```

### Database Backup:
```bash
# Manual snapshot
aws rds create-db-snapshot \
    --db-instance-identifier realestate-investor-db \
    --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

## 🎉 You're Live!

Once all checkboxes are complete, your Real Estate Investor Platform is live and auto-scaling!

**Live URL:** `https://_____.vercel.app`

**Features Available:**
✅ Property search (3 methods: city, ZIP, GPS)
✅ AI-powered CMA reports with crime scoring
✅ Tenant management
✅ Rent collection & billing
✅ Lease management
✅ Property inspections with AI damage assessment
✅ Accounting integrations
✅ Auto-scaling infrastructure

**Next Development Steps:**
1. Mobile app (React Native)
2. Payment processing (Stripe Connect)
3. Email notifications (AWS SES)
4. Document generation (lease PDFs)
5. Vendor portal
