@echo off
echo Starting Network Management Platform...
set NODE_ENV=production
set PORT=3000
set N8N_BASE_URL=http://localhost:5678
set LOG_LEVEL=info
node server.js
pause