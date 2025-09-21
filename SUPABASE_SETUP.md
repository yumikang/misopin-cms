# Supabase Database Setup Instructions

## IMPORTANT: Database Tables Must Be Created Manually

The popups table and other tables need to be created in Supabase SQL Editor.

### Step 1: Login to Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `wizlegjvfapykufzrojl`

### Step 2: Open SQL Editor
1. In the left sidebar, click on "SQL Editor"
2. Click "New query"

### Step 3: Run the Database Script
1. Copy the entire contents of `/scripts/init-database.sql`
2. Paste into the SQL Editor
3. Click "Run" button

### Step 4: Verify Tables
After running the script, verify that these tables exist:
- users
- reservations
- popups ← **This is currently missing!**
- board_categories
- board_posts
- pages
- files
- settings

### Step 5: Test the Application
Once tables are created, test the popup management:

```bash
# Test GET popups
curl http://localhost:3010/api/popups

# Test POST popup
curl -X POST http://localhost:3010/api/popups \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Popup","content":"Test Content","display_type":"MODAL","is_active":true}'
```

## Troubleshooting

### "Could not find the table 'public.popups' in the schema cache"
This error means the popups table doesn't exist in Supabase. Run the SQL script above.

### Tables Already Exist
The script uses "CREATE TABLE IF NOT EXISTS" so it's safe to run multiple times.

### RLS Policies
The script includes RLS policies that allow the Service Role key to bypass Row Level Security.
Make sure your .env file has the correct SUPABASE_SERVICE_ROLE_KEY.