# AWS Auto-Scaling Deployment Guide

## 🎯 Deployment Architecture

**For dynamic, auto-scaling deployment**, we'll use:

### Application Layer
- **Vercel** (Next.js hosting)
  - Auto-scales automatically
  - Global CDN
  - Zero configuration
  - Pay per request

### Database Layer
- **AWS RDS PostgreSQL with Auto-Scaling**
  - Starts small, grows with load
  - Auto-scaling storage
  - Read replicas for high traffic
  - Backup and recovery

### Storage Layer
- **AWS S3** (unlimited, auto-scaling)
  - Photos, floor plans, documents
  - Pay only for what you use

---

## 🚀 Quick Start Deployment

### Step 1: Push to GitHub (2 minutes)

```bash
cd "/Users/keithperez/Documents/Claud/Realestate App"

# Initialize git
git init
git add .
git commit -m "Initial deployment"

# Create repo on github.com then:
git remote add origin https://github.com/YOUR_USERNAME/realestate-app.git
git push -u origin main
```

### Step 2: Deploy to Vercel (3 minutes)

1. Go to **https://vercel.com/signup**
2. Sign in with GitHub
3. Click **"New Project"**
4. Import your `realestate-app` repo
5. Click **"Deploy"**

✅ **Your app is now live!** at `https://your-project.vercel.app`

### Step 3: Set Up Auto-Scaling Database (10 minutes)

I'll create the AWS RDS instance with auto-scaling enabled.

**Database Choice**: PostgreSQL with:
- Auto-scaling storage (20GB → 1TB automatically)
- Auto-scaling compute (can add read replicas)
- Automatic backups
- Multi-AZ for high availability

---

## 💰 Cost (Auto-Scaling, Pay-As-You-Grow)

### Starting Costs (Low Traffic):
- **Vercel**: FREE (hobby tier) or $20/mo (pro)
- **AWS RDS**: ~$15/mo (db.t4g.micro with 20GB)
- **AWS S3**: ~$1/mo (first 50GB)
- **Total**: **~$16-36/month**

### High Traffic (1000+ properties, 500+ tenants):
- **Vercel**: $20/mo (pro tier)
- **AWS RDS**: ~$200/mo (db.t4g.large + read replicas)
- **AWS S3**: ~$20/mo (1TB storage)
- **Total**: **~$240/month**

**It automatically scales between these as your usage grows!**

---

## 📊 Auto-Scaling Configuration

### Database Auto-Scaling

```sql
-- RDS automatically scales:
Storage: 20GB → 100GB → 1TB (as needed)
Compute: t4g.micro → t4g.small → t4g.medium
Read Replicas: 0 → 2 → 5 (based on load)
```

### Application Auto-Scaling (Vercel)

```
Low traffic: 1 serverless function instance
Medium: 10 instances
High: 100+ instances
Scales automatically in seconds
```

---

## 🔧 Automated Deployment

I've created automated deployment scripts for you:

### Quick Deploy (2 commands):

```bash
# 1. Deploy to Vercel (3 minutes)
./deploy-to-vercel.sh

# 2. Set up AWS RDS PostgreSQL (15 minutes)
./setup-aws-rds.sh
```

That's it! Your app will be live with auto-scaling database.

---

## 📋 Detailed Step-by-Step Guide

### Step 1: Deploy to Vercel (3 minutes)

```bash
cd "/Users/keithperez/Documents/Claud/Realestate App"
./deploy-to-vercel.sh
```

**What this does:**
1. Installs Vercel CLI if needed
2. Deploys your Next.js app to Vercel
3. Gives you a live URL (e.g., `https://realestate-investor-app.vercel.app`)

**After deployment:**
1. Go to https://vercel.com/dashboard
2. Find your project: `realestate-investor-app`
3. Copy your deployment URL

### Step 2: Configure Environment Variables (2 minutes)

In Vercel Dashboard → Settings → Environment Variables, add:

**Required (add these now):**
```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-with-command-below>
```

Generate secret:
```bash
openssl rand -base64 32
```

**Property Data (optional - you already have these):**
```
BRIGHT_DATA_API_TOKEN=b773aaf2-a632-459f-b217-5d38368db5f6
BRIGHT_DATA_DATASET_ID=gd_lwh4f6i08oqu8aw1q5
```

**AI Analysis (optional - if you have OpenAI key):**
```
OPENAI_API_KEY=sk-...
```

### Step 3: Set Up Production Database (15 minutes)

**Prerequisites:**
```bash
# Install AWS CLI (if not installed)
brew install awscli

# Configure AWS credentials
aws configure
```

You'll need:
- AWS Access Key ID (from AWS Console → IAM)
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)

**Run the setup:**
```bash
./setup-aws-rds.sh
```

**What this does:**
1. Creates PostgreSQL RDS instance (db.t4g.micro)
2. Enables auto-scaling storage (20GB → 100GB)
3. Configures security groups
4. Generates secure password
5. Outputs DATABASE_URL

**After database is ready:**
1. Copy the `DATABASE_URL` from terminal output
2. Add it to Vercel Environment Variables:
   ```
   DATABASE_URL=postgresql://username:password@endpoint:5432/realestate_investor?schema=public
   ```
3. Redeploy in Vercel Dashboard

### Step 4: Run Database Migrations

After DATABASE_URL is configured in Vercel:

```bash
# Update Prisma schema for PostgreSQL
# (We need to change from SQLite to PostgreSQL)
```

I'll create a migration script for this...

### Step 5: Test Your Live App

1. Visit your Vercel URL
2. Create an account
3. Search for properties
4. Test all features

---

## 💰 Actual Costs

### Starting Costs (Low Traffic):
- **Vercel**: FREE (hobby tier, 100GB bandwidth)
  - Upgrade to Pro ($20/mo) when you need custom domain
- **AWS RDS db.t4g.micro**: ~$12/month
  - 2 vCPU, 1GB RAM
  - 20GB storage (auto-scales to 100GB)
- **AWS Data Transfer**: ~$3/month (first 1GB free)
- **Total**: **~$15-35/month**

### High Traffic Costs:
When you hit limits, AWS auto-scales:
- **Vercel Pro**: $20/month (custom domain, more bandwidth)
- **AWS RDS db.t4g.large**: ~$200/month
  - 2 vCPU, 8GB RAM
  - Auto-scaling read replicas
- **AWS S3**: ~$20/month (1TB storage)
- **Total**: **~$240/month**

You only pay for what you use. Starts cheap, scales automatically!

---

## 🔒 Security Checklist

Before going live, ensure:
- [ ] NEXTAUTH_SECRET is random and secure
- [ ] Database password is strong (auto-generated by script)
- [ ] API keys are in environment variables, not in code
- [ ] RDS security group restricts access (update from 0.0.0.0/0)
- [ ] SSL/TLS enabled (Vercel handles this automatically)

---

## 📊 Monitoring & Scaling

### Database Auto-Scaling:
```
Storage: 20GB → 100GB (automatic)
Compute: db.t4g.micro → db.t4g.small → db.t4g.medium (manual upgrade when needed)
```

### When to upgrade compute:
- CPU > 80% for sustained periods
- Connection pool exhausted
- Query response times increasing

### Application Auto-Scaling:
Vercel handles this automatically:
- 1 instance (idle)
- 10 instances (moderate traffic)
- 100+ instances (high traffic)

---

## 🔧 Troubleshooting

### Database Connection Issues:
```bash
# Test connection
psql "postgresql://username:password@endpoint:5432/realestate_investor"
```

### Vercel Deployment Issues:
```bash
# Check build logs
vercel logs
```

### Need to rollback?
```bash
vercel rollback
```

