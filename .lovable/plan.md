

## Plan: Fix Zoom, Photo Display, Simplify Watermarks, Add "Prepare for Print"

### 1. Fix lightbox zoom (broken)

**Root cause:** Framer Motion's `animate={{ scale: 1 }}` overrides the inline `style.transform` with `scale(2.5)`. Both compete for the `transform` property.

**Fix in `PhotoLightbox.tsx`:**
- Replace `<motion.img>` with a regular `<img>` inside a `<motion.div>` wrapper
- The wrapper handles enter/exit animations (opacity, scale 0.9→1)
- The inner `<img>` handles zoom via inline `style.transform` and `transformOrigin` — no conflict with framer-motion
- Keep `overflow-hidden` on the container so zoomed image doesn't bleed outside bounds

### 2. Fix photo card display — show full photo

**In `PhotoCard.tsx`:**
- Change container from `aspect-[4/3] overflow-hidden` to `bg-neutral-100 dark:bg-neutral-800` with flexible height
- Change `object-cover` to `object-contain` so entire photo is visible regardless of orientation
- Keep `aspect-[4/3]` but use `object-contain` — this gives consistent card sizes while showing the full image with letterboxing

### 3. Simplify watermark

**In `watermark.ts`:**
- Remove `watermarkText` parameter — hardcode `"PREVIEW"`
- Keep only 1 pass at -30° with moderate alpha (0.35 fill, 0.2 stroke)
- Double the spacing between tiles (fewer watermarks)
- Remove the large centered third pass
- Signature becomes `applyWatermark(file: File): Promise<Blob>`

**In `AdminDashboard.tsx`:**
- Remove "Текст водяного знака" input field from create event form
- Remove `newWatermark` state and `p_watermark_text` from the RPC call
- Simplify upload call: `applyWatermark(file)` instead of `applyWatermark(file, watermarkText)`

### 4. "Prepare for Print" — ZIP archive of ordered photos

This is the most complex feature. Since only watermarked photos exist in storage, we need originals.

#### 4a. Database changes (SQL migration)
- Create private `event-originals` storage bucket
- Add `original_storage_path text` column to `photos` table (nullable for backward compat)
- Update `admin_add_photo` RPC to accept optional `p_original_storage_path`
- Create new RPC `admin_get_orders_for_print(p_admin_token, p_event_id)` returning: `customer_name`, `photo_filename`, `original_storage_path`, `print_size_name`, `quantity`
- Add storage policy: only service_role can access `event-originals`

#### 4b. Upload flow changes (`AdminDashboard.tsx`)
- During upload, create TWO versions of each photo:
  1. **Preview** (watermarked) → uploaded to `event-photos` bucket (existing)
  2. **Original** (no watermark, resized to max 2400px, JPEG 0.92 quality) → uploaded to `event-originals` bucket
- Pass `p_original_storage_path` to `admin_add_photo`
- New helper in `watermark.ts`: `compressOriginal(file: File): Promise<Blob>` — resizes without watermark

#### 4c. Edge function: `sign-original-urls`
- Accepts `{ admin_token, paths: string[] }`
- Validates admin token
- Returns signed URLs for private `event-originals` bucket files (1 hour expiry)
- Uses service role key to sign

#### 4d. Client-side ZIP build
- Add `jszip` dependency
- New component/logic in `AdminDashboard.tsx`: "Подготовить к печати" button per event
- On click:
  1. Fetch orders via `admin_get_orders_for_print`
  2. Get signed URLs for originals via edge function
  3. Download each file, build ZIP with JSZip:
     - `10x15/{filename}` — flat folder for 10x15 size
     - `{OtherSize}/{CustomerName}/{filename}` — nested for other sizes
  4. Show progress dialog during build
  5. Trigger browser download of the ZIP

#### Archive structure example:
```text
archive.zip
├── 10x15/
│   ├── photo1.jpeg
│   ├── photo2.jpeg
│   └── photo3.jpeg
├── 15x20/
│   ├── Иванов Иван/
│   │   ├── photo1.jpeg
│   │   └── photo4.jpeg
│   └── Петрова Мария/
│       └── photo2.jpeg
└── 20x30/
    └── Сидоров Алексей/
        └── photo5.jpeg
```

### Summary of files changed

| File | Change |
|------|--------|
| `src/components/PhotoLightbox.tsx` | Fix zoom by separating framer-motion animation from CSS transform |
| `src/components/PhotoCard.tsx` | `object-contain` + neutral background for full photo visibility |
| `src/lib/watermark.ts` | Hardcode "PREVIEW", 1 pass, wider spacing, add `compressOriginal()` |
| `src/pages/AdminDashboard.tsx` | Remove watermark input, upload originals, add "Подготовить к печати" button with ZIP logic |
| SQL migration | Private bucket, `original_storage_path` column, `admin_get_orders_for_print` RPC |
| `supabase/functions/sign-original-urls/index.ts` | Edge function to sign private URLs |
| `supabase/config.toml` | Add `[functions.sign-original-urls]` with `verify_jwt = false` |
| `package.json` | Add `jszip` dependency |

