#!/bin/bash

# AWS RDS PostgreSQL Setup Script
# Creates auto-scaling PostgreSQL database for production

echo "🗄️  AWS RDS PostgreSQL Auto-Scaling Setup"
echo "=========================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Installing..."
    echo ""
    echo "For macOS:"
    echo "  brew install awscli"
    echo ""
    echo "For Linux:"
    echo "  sudo apt-get install awscli"
    echo ""
    echo "After installation, run: aws configure"
    exit 1
fi

echo "✅ AWS CLI is ready"
echo ""

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo "Run: aws configure"
    echo ""
    echo "You'll need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region (e.g., us-east-1)"
    exit 1
fi

echo "✅ AWS credentials configured"
echo ""

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

echo "📋 AWS Account Information:"
echo "   Account ID: $AWS_ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo ""

# Configuration
DB_INSTANCE_IDENTIFIER="realestate-investor-db"
DB_NAME="realestate_investor"
DB_USERNAME="realestate_admin"
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

echo "🔧 Database Configuration:"
echo "   Instance ID: $DB_INSTANCE_IDENTIFIER"
echo "   Database Name: $DB_NAME"
echo "   Username: $DB_USERNAME"
echo "   Password: $DB_PASSWORD (save this!)"
echo ""

# Create security group for RDS
echo "🔒 Creating security group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name realestate-rds-sg \
    --description "Security group for Real Estate RDS instance" \
    --query 'GroupId' \
    --output text 2>/dev/null)

if [ -z "$SG_ID" ]; then
    echo "   Security group already exists, fetching ID..."
    SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=realestate-rds-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
fi

echo "   Security Group ID: $SG_ID"

# Allow PostgreSQL access from anywhere (you should restrict this to your IPs)
echo "   Configuring security group rules..."
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 2>/dev/null

echo "✅ Security group ready"
echo ""

# Create RDS instance with auto-scaling
echo "🚀 Creating RDS PostgreSQL instance..."
echo "   This will take 10-15 minutes..."
echo ""

aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
    --db-instance-class db.t4g.micro \
    --engine postgres \
    --engine-version 15.5 \
    --master-username $DB_USERNAME \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --max-allocated-storage 100 \
    --storage-type gp3 \
    --storage-encrypted \
    --vpc-security-group-ids $SG_ID \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --publicly-accessible \
    --auto-minor-version-upgrade \
    --db-name $DB_NAME \
    --tags Key=Project,Value=RealEstateInvestor Key=Environment,Value=Production

if [ $? -eq 0 ]; then
    echo "✅ RDS instance creation initiated"
    echo ""
    echo "⏳ Waiting for database to be available..."

    aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_IDENTIFIER

    # Get endpoint
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)

    DB_PORT=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --query 'DBInstances[0].Endpoint.Port' \
        --output text)

    echo ""
    echo "🎉 Database is ready!"
    echo ""
    echo "📋 Connection Information:"
    echo "========================================"
    echo "Endpoint: $DB_ENDPOINT"
    echo "Port: $DB_PORT"
    echo "Database: $DB_NAME"
    echo "Username: $DB_USERNAME"
    echo "Password: $DB_PASSWORD"
    echo ""
    echo "🔗 DATABASE_URL (for Vercel):"
    echo "========================================"
    echo "postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:$DB_PORT/$DB_NAME?schema=public"
    echo ""
    echo "⚠️  IMPORTANT: Save this information in a secure location!"
    echo ""

    # Save to .env.production
    cat > .env.production << EOF
# Production Database (AWS RDS PostgreSQL)
DATABASE_URL="postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:$DB_PORT/$DB_NAME?schema=public"

# Connection Details (for reference)
DB_HOST="$DB_ENDPOINT"
DB_PORT="$DB_PORT"
DB_NAME="$DB_NAME"
DB_USERNAME="$DB_USERNAME"
DB_PASSWORD="$DB_PASSWORD"

# AWS Information
AWS_REGION="$AWS_REGION"
AWS_ACCOUNT_ID="$AWS_ACCOUNT_ID"
RDS_INSTANCE_ID="$DB_INSTANCE_IDENTIFIER"
EOF

    echo "✅ Connection details saved to .env.production"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Copy the DATABASE_URL above"
    echo "2. Go to Vercel Dashboard → Settings → Environment Variables"
    echo "3. Add DATABASE_URL with the value above"
    echo "4. Redeploy your application"
    echo "5. Run database migrations:"
    echo "   npx prisma migrate deploy"
    echo ""

else
    echo "❌ Failed to create RDS instance"
    echo "Check the error message above"
fi
