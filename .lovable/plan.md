

## Plan: Rewrite PhotoCard to always show the full photo

### Problem
The current `PhotoCard` uses `max-h-80 object-contain` on a flex container — but `object-contain` only works correctly when the image is placed inside a **fixed-size container**. Without a fixed height container, `object-contain` has no box to "contain" into, and the browser renders the image at its natural aspect ratio, which can overflow or get clipped depending on CSS interactions with the parent grid.

### Solution
Use a **fixed-height container** (`h-56` = 224px) with `object-contain` — the image always fits fully inside a consistent box with neutral background padding. All cards in the grid will be the same height.

### Changes in `src/components/PhotoCard.tsx`

Replace the image container (lines 63-75):

**From:**
```tsx
<div
  className="relative cursor-pointer bg-muted/40 flex items-center justify-center p-2"
  onClick={onPhotoClick}
>
  <img
    src={photoUrl}
    alt={filename}
    className="block w-full h-auto max-h-80 object-contain"
    loading="lazy"
    onContextMenu={(e) => e.preventDefault()}
    draggable={false}
  />
</div>
```

**To:**
```tsx
<div
  className="relative cursor-pointer bg-neutral-100 dark:bg-neutral-800 h-56"
  onClick={onPhotoClick}
>
  <img
    src={photoUrl}
    alt={filename}
    className="w-full h-full object-contain"
    loading="lazy"
    onContextMenu={(e) => e.preventDefault()}
    draggable={false}
  />
</div>
```

Key difference: the container has a **fixed height** (`h-56`), and the image uses `w-full h-full object-contain`. This guarantees the photo is always visible in full — portrait, landscape, or square — fitted within the 224px box with neutral background filling the empty space.

### Why previous attempts failed
- `max-h-80` with `h-auto` means the container height depends on the image's natural size — there's no fixed box to contain into
- `object-contain` without a fixed container is essentially a no-op
- The parent `overflow-hidden` on the card was also clipping content

### No other files need changes
- The grid layout in `EventPage.tsx` stays as-is (4-column grid)
- The admin preview in `EventPhotosManagerDialog.tsx` already uses `aspect-[4/3]` with `object-cover` which is fine for admin thumbnails

