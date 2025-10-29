# TipTap Editing System - Deployment Guide

## Overview
This guide covers the deployment and initialization of the TipTap-based editing system for static HTML pages with data-editable attributes.

## System Components

### Database Tables
- `static_pages` - Static page metadata with edit mode tracking
- `editable_elements` - Parsed data-editable elements from HTML
- `static_page_versions` - Version history for content changes

### Key Features
- **Attribute Parser**: Extracts data-editable attributes from HTML
- **TipTap Editor**: Rich text editing interface
- **Element Management**: Track and edit 272 data-editable elements across 12 pages
- **Auto-sync**: Database synchronization with HTML files

## Deployment Steps

### 1. Environment Setup

Ensure `.env` contains:
```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

### 2. Database Migration

Apply schema changes:
```bash
# Push schema to database
npx prisma db push

# Or use migrations (production)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. HTML File Placement

HTML files should be in:
```
public/static-pages/
├── acne.html
├── botox.html
├── diet.html
├── filler.html
├── hair-removal.html
├── jeomin.html
├── lifting.html
├── milia.html
├── mole.html
├── peeling.html
├── skinbooster.html
└── tattoo.html
```

### 4. Initial Data Seeding

Seed static pages metadata:
```bash
npm run db:seed:static-pages
```

Expected output:
```
✓ Created: 여드름 치료 (acne)
✓ Created: 보톡스 (botox)
...
✅ Static pages seeding completed!
```

### 5. Parse HTML and Sync Elements

Parse all HTML files and extract data-editable attributes:
```bash
npm run db:parse:initial
```

Expected output:
```
=== Parsing acne.html ===
✓ Parsed 25 elements
✓ Synced to database: 25 elements
...
✅ Initial parse completed!
   Pages processed: 12/12
   Total elements: 272
```

### 6. Verify Deployment

Run verification script:
```bash
npm run db:verify
```

Expected output:
```
✓ Pages found: 12
✓ Total elements: 272
✓ Synced: 12/12 pages
✅ All pages are synced and have editable elements!
```

## Element Statistics

### By Type
- TEXT: 187 elements (69%)
- HTML: 49 elements (18%)
- BACKGROUND: 24 elements (9%)
- IMAGE: 12 elements (4%)

### By Section
- process: 92 elements
- banner: 60 elements
- intro: 55 elements
- hero: 36 elements
- principle: 29 elements

## API Endpoints

### Parse HTML
```
POST /api/static-pages/[slug]/parse
```

Parses HTML file and updates editable_elements table.

### Get Elements
```
GET /api/static-pages/[slug]/elements
```

Returns all editable elements for a page.

### Update Element
```
PATCH /api/static-pages/elements/[elementId]
```

Updates a single element's content.

### Sync to HTML
```
POST /api/static-pages/[slug]/sync
```

Writes database changes back to HTML file.

## Troubleshooting

### Migration Issues

If you see "column does not exist" errors:
```bash
# Reset Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Verify schema
npm run db:verify
```

### Parsing Failures

If parsing fails for a specific page:
```bash
# Check HTML file exists
ls -la public/static-pages/[slug].html

# Run individual parse via API
curl -X POST http://localhost:3000/api/static-pages/[slug]/parse
```

### Element Count Mismatch

If element counts don't match:
```bash
# Re-parse all pages
npm run db:parse:initial

# Verify sync status
npm run db:verify
```

### Empty Values

Some elements may have empty values (backgrounds, images):
- This is expected for CSS backgrounds set via class
- Image elements may lack alt text (should be added manually)

## Maintenance

### Re-parsing Pages

After HTML updates:
```bash
# Re-parse specific page via API
POST /api/static-pages/[slug]/parse

# Or re-parse all pages
npm run db:parse:initial
```

### Database Reset

To completely reset:
```bash
# Clear editable_elements
npx prisma db execute --stdin <<< "DELETE FROM editable_elements;"

# Re-run initial parse
npm run db:parse:initial
```

## Performance

### Current Stats
- 12 HTML files
- 272 total elements
- Average: 22.7 elements per page
- Parse time: ~1-2 seconds per page

### Optimization Tips
- Use batch updates for multiple elements
- Cache parsed elements in memory
- Enable database indexes (already configured)

## Next Steps

1. **Testing**: Test TipTap editor UI with real elements
2. **Validation**: Add content validation rules
3. **Versioning**: Implement version history UI
4. **Sync**: Test HTML file sync functionality
5. **Production**: Deploy to production environment

## Support

For issues or questions:
- Check logs: Check application logs for detailed errors
- Database access: Use Prisma Studio: `npx prisma studio`
- Run verification: `npm run db:verify`
