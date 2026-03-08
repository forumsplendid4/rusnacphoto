

## Plan: Click-to-Zoom in Lightbox

Add zoom functionality to `PhotoLightbox.tsx` — clicking on the photo toggles between fit-to-screen and 2x zoom centered on the click point.

### Implementation in `PhotoLightbox.tsx`:

1. **State:** Add `zoomed: boolean` and `transformOrigin: string` state variables.

2. **Click handler on image container:**
   - On click, calculate click position as percentage of the image (`e.nativeEvent.offsetX / width`, `e.nativeEvent.offsetY / height`)
   - Set `transformOrigin` to that percentage point (e.g. `"65% 40%"`)
   - Toggle `zoomed` state

3. **Styling when zoomed:**
   - When zoomed: apply `scale(2)` via inline `transform`, set `cursor: zoom-out`, wrap image in a scrollable overflow container
   - When not zoomed: normal fit view, `cursor: zoom-in`

4. **Reset zoom** when navigating prev/next or when lightbox closes.

5. **Preserve security:** Keep `onContextMenu` prevention and `select-none` on the image. Remove `pointer-events-none` from the img (needed to detect click position), keep the overlay for right-click blocking.

### Key details:
- No new dependencies needed — pure CSS transform + React state
- Zoom resets on photo change (prev/next/close)
- Desktop: click to zoom in at point, click again to zoom out
- Mobile: same behavior (tap to zoom)

