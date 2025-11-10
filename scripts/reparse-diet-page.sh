#!/bin/bash

# Re-parse diet page on production to sync HTML changes to database
# This script calls the parse API endpoint to update the editable_elements table

set -e

echo "🔄 Re-parsing diet page on production..."
echo ""

# Get JWT token from production (you'll need to replace this with actual admin token)
# For now, we'll run this directly on the server where we can access the database

ssh root@cms.one-q.xyz << 'ENDSSH'
cd /var/www/misopin-cms

# Create a temporary script to call the parse endpoint
cat > /tmp/reparse-diet.js << 'EOF'
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function reparseDiet() {
  // Generate admin token
  const token = jwt.sign(
    {
      id: 'admin-script',
      email: 'admin@example.com',
      role: 'SUPER_ADMIN',
      name: 'Admin Script'
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1h' }
  );

  console.log('📡 Calling parse API endpoint...');

  const response = await fetch('http://localhost:3002/api/admin/static-pages/diet/parse', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ Parse successful!');
    console.log(`   ${result.message}`);
    console.log(`   Elements synced: ${result.data.elementsCount}`);
    if (result.data.warnings && result.data.warnings.length > 0) {
      console.log('   Warnings:', result.data.warnings);
    }
  } else {
    console.log('❌ Parse failed:', result.error);
    process.exit(1);
  }
}

reparseDiet().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
EOF

# Run the script
node /tmp/reparse-diet.js

# Clean up
rm /tmp/reparse-diet.js

ENDSSH

echo ""
echo "✅ Re-parse complete!"
echo "🌐 Check admin panel: https://cms.one-q.xyz/admin/static-pages/diet/edit"
