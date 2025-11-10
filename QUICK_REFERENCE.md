# TipTap Editing System - Quick Reference

## Common Commands

### Database Operations
```bash
# Migrate database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed static pages
npm run db:seed:static-pages

# Parse all HTML files
npm run db:parse:initial

# Verify deployment
npm run db:verify

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Development
```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

### Re-parsing Pages

**Single page via API**:
```bash
curl -X POST http://localhost:3000/api/static-pages/acne/parse
```

**All pages**:
```bash
npm run db:parse:initial
```

## File Locations

### HTML Files
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

### Parser & Sync
```
lib/static-pages/
├── attribute-parser.ts      # HTML → Database
├── attribute-sync.ts         # Database → HTML
└── types.ts
```

### API Routes
```
app/api/static-pages/
├── [slug]/
│   ├── elements/route.ts    # GET /api/static-pages/[slug]/elements
│   ├── parse/route.ts       # POST /api/static-pages/[slug]/parse
│   └── sync/route.ts        # POST /api/static-pages/[slug]/sync
```

### UI Components
```
components/static-pages/
├── EditableElementList.tsx
├── TipTapEditor.tsx
└── types.ts
```

### Scripts
```
scripts/
├── seed-static-pages.ts     # Initialize pages
├── initial-parse.ts         # Parse all HTML
└── verify-deployment.ts     # Verify system
```

## Database Quick Reference

### Tables
- **static_pages**: 19 pages (12 with elements)
- **editable_elements**: 272 total elements
- **static_page_versions**: Version history

### Element Types
- TEXT: 187 (68.8%)
- HTML: 49 (18.0%)
- BACKGROUND: 24 (8.8%)
- IMAGE: 12 (4.4%)

### Sections
- process: 92 elements
- banner: 60 elements
- intro: 55 elements
- hero: 36 elements
- principle: 29 elements

## API Quick Reference

### Get Elements for a Page
```bash
GET /api/static-pages/acne/elements
```

**Response**:
```json
{
  "success": true,
  "elements": [
    {
      "id": "elem_123",
      "elementId": "acne-hero-title",
      "elementType": "TEXT",
      "label": "Hero Title",
      "currentValue": "여드름 치료",
      "sectionName": "hero"
    }
  ]
}
```

### Parse HTML File
```bash
POST /api/static-pages/acne/parse
```

**Response**:
```json
{
  "success": true,
  "parsed": 25,
  "synced": 25
}
```

### Update Element
```bash
PATCH /api/static-pages/elements/elem_123
Content-Type: application/json

{
  "value": "새로운 제목"
}
```

### Sync to HTML
```bash
POST /api/static-pages/acne/sync
```

## Troubleshooting

### "Column does not exist" error
```bash
npx prisma generate
npx prisma db push
```

### Parsing fails
```bash
# Check file exists
ls public/static-pages/[slug].html

# Check permissions
chmod 644 public/static-pages/*.html

# Re-parse
npm run db:parse:initial
```

### Element count mismatch
```bash
# Verify database
npm run db:verify

# Re-sync if needed
npm run db:parse:initial
```

### Build errors
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Common Workflows

### Adding a New Page
1. Add HTML file to `public/static-pages/[slug].html`
2. Add data-editable attributes to HTML
3. Seed the page:
   ```bash
   # Add to scripts/seed-static-pages.ts
   # Then run:
   npm run db:seed:static-pages
   ```
4. Parse the page:
   ```bash
   curl -X POST http://localhost:3000/api/static-pages/[slug]/parse
   ```

### Updating Content
1. Update via TipTap editor UI
2. Changes saved to database automatically
3. Sync to HTML when ready:
   ```bash
   curl -X POST http://localhost:3000/api/static-pages/[slug]/sync
   ```

### Checking Status
```bash
# Full verification
npm run db:verify

# Or use Prisma Studio
npx prisma studio
```

## Environment Variables

Required in `.env`:
```env
DATABASE_URL="postgresql://user:pass@host:port/database"
```

## Performance Tips

- Elements cache in memory (fast reads)
- Batch updates use transactions (atomic)
- Indexes on pageId, sectionName, order (optimized queries)
- Parse only when HTML changes (avoid re-parsing)

## Support

- **Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
- **Phase 6 Report**: See `PHASE6_COMPLETION_REPORT.md`
- **Database GUI**: Run `npx prisma studio`
- **Logs**: Check Next.js console output
