#!/bin/bash

echo "🚀 Starting deployment..."

# Install dependencies
npm ci --production

# Run database migrations
npm run db:migrate

# Build assets
npm run build

# Restart application
pm2 restart ecosystem.config.js

# Health check
sleep 5
curl -f http://localhost:3000/health || exit 1

echo "✅ Deployment completed successfully!"