# AWS Deployment Guide 🚀

Deploy your Real Estate Investor Platform to AWS with **budget-friendly options**.

## 💰 Cost Estimate

### Budget Option (~$15-30/month)
- **AWS Lightsail:** $3.50-12/month (VPS)
- **RDS PostgreSQL (Free Tier):** $0 for 12 months, then ~$15/month
- **Route 53 (DNS):** $0.50/month
- **SSL Certificate (ACM):** FREE
- **Total:** ~$15-30/month

### Production Option (~$50-100/month)
- **AWS EC2 (t3.small):** ~$15/month
- **RDS PostgreSQL (db.t3.micro):** ~$15/month
- **Application Load Balancer:** ~$16/month
- **CloudFront CDN:** ~$1-5/month (pay per use)
- **S3 Storage:** ~$1/month
- **Total:** ~$50-100/month

---

## 🎯 Deployment Options

### Option 1: AWS Lightsail (Easiest & Cheapest) ✅ RECOMMENDED

**Best for:** Testing and small-scale deployment

**Cost:** $3.50-12/month

**Steps:**

#### 1. Create Lightsail Instance

```bash
# Install AWS CLI
brew install awscli  # macOS
# or
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

#### 2. Launch Instance via AWS Console

1. Go to: https://lightsail.aws.amazon.com/
2. Click "Create Instance"
3. Select:
   - **Platform:** Linux/Unix
   - **Blueprint:** Node.js
   - **Plan:** $12/month (2 GB RAM, 2 vCPU) - Recommended
   - **Instance name:** realestate-app

4. Wait for instance to be ready

#### 3. Set Up PostgreSQL

Option A: Use Lightsail Managed Database
```bash
# Create managed PostgreSQL instance
# Via Console: Lightsail > Databases > Create database
# Plan: $15/month (1 GB RAM)
```

Option B: Install PostgreSQL on same instance (cheaper)
```bash
# SSH into your instance
ssh -i ~/.ssh/lightsail_key.pem ubuntu@YOUR_INSTANCE_IP

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Configure PostgreSQL
sudo -u postgres psql
CREATE DATABASE realestate_investor;
CREATE USER appuser WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE realestate_investor TO appuser;
\q
```

#### 4. Deploy Your App

```bash
# SSH into instance
ssh -i ~/.ssh/lightsail_key.pem ubuntu@YOUR_INSTANCE_IP

# Install Node.js (if not pre-installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repository (or upload files)
git clone https://github.com/yourusername/realestate-app.git
cd realestate-app

# Install dependencies
npm install

# Create .env file
nano .env
```

Paste your environment variables:
```env
DATABASE_URL="postgresql://appuser:your_secure_password@localhost:5432/realestate_investor"
NEXTAUTH_URL="http://YOUR_INSTANCE_IP:3000"
NEXTAUTH_SECRET="generate-a-secure-secret-here"
OPENAI_API_KEY="sk-..."
ZILLOW_API_KEY="your-rapidapi-key"
REALTOR_API_KEY="your-rapidapi-key"
```

```bash
# Initialize database
npx prisma db push

# Build the app
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start the app
pm2 start npm --name "realestate-app" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

#### 5. Configure Firewall

```bash
# In AWS Lightsail Console:
# Your instance > Networking > Firewall
# Add rule: HTTP (port 80)
# Add rule: HTTPS (port 443)
# Add rule: Custom TCP (port 3000) - for testing
```

#### 6. Access Your App

Visit: `http://YOUR_INSTANCE_IP:3000`

---

### Option 2: AWS EC2 with RDS (Production)

**Best for:** Production deployment with scalability

**Cost:** ~$50-100/month

#### 1. Launch EC2 Instance

```bash
# Create EC2 instance via CLI
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=realestate-app}]'
```

Or use AWS Console:
1. Go to: https://console.aws.amazon.com/ec2/
2. Launch Instance
3. Choose: Ubuntu Server 22.04 LTS
4. Instance type: t3.small (2 vCPU, 2 GB RAM)
5. Configure security group:
   - SSH (22) - Your IP
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom TCP (3000) - 0.0.0.0/0

#### 2. Create RDS PostgreSQL Database

```bash
# Via CLI
aws rds create-db-instance \
  --db-instance-identifier realestate-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username dbadmin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --publicly-accessible
```

Or via Console:
1. Go to: https://console.aws.amazon.com/rds/
2. Create Database
3. Choose: PostgreSQL
4. Template: Free tier
5. DB instance identifier: realestate-db
6. Master username: dbadmin
7. Master password: YOUR_SECURE_PASSWORD
8. DB instance class: db.t3.micro
9. Storage: 20 GB

#### 3. Deploy Application

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y

# Clone repository
git clone https://github.com/yourusername/realestate-app.git
cd realestate-app

# Install dependencies
npm install

# Create .env file
nano .env
```

```env
DATABASE_URL="postgresql://dbadmin:YOUR_PASSWORD@your-rds-endpoint.rds.amazonaws.com:5432/realestate_investor"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="generate-a-secure-secret"
OPENAI_API_KEY="sk-..."
ZILLOW_API_KEY="your-rapidapi-key"
REALTOR_API_KEY="your-rapidapi-key"
```

```bash
# Initialize database
npx prisma db push

# Build application
npm run build

# Install and configure PM2
sudo npm install -g pm2
pm2 start npm --name "realestate-app" -- start
pm2 save
pm2 startup

# Install and configure Nginx
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/realestate-app
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/realestate-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install Certbot for SSL
sudo snap install --classic certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### Option 3: AWS Amplify (Serverless) 🚀

**Best for:** Automatic scaling, minimal ops

**Cost:** Pay-as-you-go (~$15-50/month)

#### 1. Install Amplify CLI

```bash
npm install -g @aws-amplify/cli
amplify configure
```

#### 2. Initialize Amplify

```bash
cd /Users/keithperez/Documents/Claud/Realestate\ App

# Initialize Amplify in your project
amplify init
```

Follow prompts:
- Enter a name: realestate-app
- Environment: production
- Default editor: VS Code
- App type: javascript
- Framework: react
- Source directory: src
- Distribution directory: .next
- Build command: npm run build
- Start command: npm run start

#### 3. Add Database (Aurora Serverless)

```bash
amplify add api
```

Choose:
- GraphQL or REST: REST
- Resource name: realestate-api
- Path: /api
- Lambda source: Create new function

Or use existing RDS:
```bash
amplify add storage
```

Choose:
- SQL (AWS Aurora Serverless v2)

#### 4. Deploy

```bash
# Deploy to AWS
amplify push

# Publish app
amplify publish
```

Your app will be available at: `https://xxxxx.amplifyapp.com`

---

## 🔒 Security Best Practices

### 1. Environment Variables

Use AWS Systems Manager Parameter Store:

```bash
# Store secrets
aws ssm put-parameter \
  --name "/realestate-app/openai-key" \
  --value "sk-..." \
  --type "SecureString"

# Retrieve in your app
npm install @aws-sdk/client-ssm
```

```typescript
// src/lib/secrets.ts
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const client = new SSMClient({ region: 'us-east-1' });

export async function getSecret(name: string) {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true,
  });
  const response = await client.send(command);
  return response.Parameter?.Value;
}
```

### 2. Restrict Database Access

```bash
# Only allow EC2 instance to access RDS
# In RDS Security Group:
# - Remove 0.0.0.0/0
# - Add EC2 security group ID
```

### 3. Use IAM Roles

```bash
# Create IAM role for EC2
aws iam create-role --role-name realestate-app-role \
  --assume-role-policy-document file://trust-policy.json
```

### 4. Enable Logging

```bash
# Configure CloudWatch Logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🎯 Domain Setup

### 1. Register Domain (Route 53)

```bash
# Check domain availability
aws route53domains check-domain-availability \
  --domain-name yourdomain.com

# Register domain (~$12/year)
aws route53domains register-domain \
  --domain-name yourdomain.com \
  --duration-in-years 1 \
  --admin-contact file://contact.json \
  --registrant-contact file://contact.json \
  --tech-contact file://contact.json
```

### 2. Create Hosted Zone

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference $(date +%s)
```

### 3. Point Domain to Your Instance

```bash
# Get your instance IP
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxx \
  --query 'Reservations[0].Instances[0].PublicIpAddress'

# Create A record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://create-record.json
```

`create-record.json`:
```json
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "yourdomain.com",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "YOUR_EC2_IP"}]
    }
  }]
}
```

---

## 📊 Monitoring & Logging

### 1. CloudWatch Monitoring

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 2. PM2 Monitoring

```bash
# Monitor app
pm2 monit

# View logs
pm2 logs realestate-app

# Set up PM2 web dashboard
pm2 install pm2-server-monit
```

### 3. Application Monitoring

Install New Relic or Datadog (optional):

```bash
# New Relic
npm install newrelic
```

---

## 🚀 Deployment Automation

### GitHub Actions Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

    - name: Deploy to EC2
      run: |
        ssh -i ${{ secrets.SSH_PRIVATE_KEY }} ubuntu@${{ secrets.EC2_HOST }} << 'EOF'
          cd ~/realestate-app
          git pull origin main
          npm install
          npm run build
          pm2 restart realestate-app
        EOF
```

---

## 💾 Backup Strategy

### Automated RDS Backups

```bash
# Enable automated backups (via CLI)
aws rds modify-db-instance \
  --db-instance-identifier realestate-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"

# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier realestate-db \
  --db-snapshot-identifier realestate-backup-$(date +%Y%m%d)
```

### Application Backups

```bash
# Set up daily backup script
sudo nano /usr/local/bin/backup-app.sh
```

```bash
#!/bin/bash
tar -czf /backup/realestate-app-$(date +%Y%m%d).tar.gz \
  /home/ubuntu/realestate-app

# Upload to S3
aws s3 cp /backup/realestate-app-$(date +%Y%m%d).tar.gz \
  s3://your-backup-bucket/
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-app.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-app.sh
```

---

## 📈 Scaling

### Horizontal Scaling (Load Balancer)

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
  --name realestate-alb \
  --subnets subnet-xxxx subnet-yyyy \
  --security-groups sg-xxxxxx

# Create target group
aws elbv2 create-target-group \
  --name realestate-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxxx

# Register instances
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-xxxxxxx
```

### Auto Scaling

```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name realestate-template \
  --version-description v1 \
  --launch-template-data file://template.json

# Create auto scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name realestate-asg \
  --launch-template LaunchTemplateName=realestate-template \
  --min-size 1 \
  --max-size 3 \
  --desired-capacity 1 \
  --target-group-arns arn:aws:elasticloadbalancing:...
```

---

## ✅ Final Checklist

- [ ] EC2/Lightsail instance created
- [ ] RDS PostgreSQL database set up
- [ ] Application deployed and running
- [ ] Domain name configured
- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] Database backups enabled
- [ ] CloudWatch monitoring set up
- [ ] PM2 process manager configured
- [ ] Security groups properly configured

---

## 💰 Cost Optimization Tips

1. **Use Reserved Instances** - Save 30-70% with 1-year commitment
2. **Right-size instances** - Start small, scale as needed
3. **Use Spot Instances** - For non-critical workloads (90% savings)
4. **Enable Auto Scaling** - Scale down during low traffic
5. **Use CloudFront** - Reduce data transfer costs
6. **Monitor with Cost Explorer** - Track spending

---

## 🎉 You're Deployed!

Your Real Estate Investor Platform is now running on AWS!

**Access your app at:**
- Lightsail: `http://YOUR_INSTANCE_IP:3000`
- EC2 with domain: `https://yourdomain.com`
- Amplify: `https://xxxxx.amplifyapp.com`

**Next steps:**
1. Test all features
2. Set up monitoring
3. Configure backups
4. Add custom domain
5. Enable CDN (CloudFront)

Need help? Check AWS documentation or contact AWS Support.
