

## Plan: Group orders by customer in admin panel

**File: `src/pages/AdminDashboard.tsx`** (lines 422-438)

Replace the flat order list with grouped display:

1. Add a `useMemo` that groups the `orders` array by composite key `customer_name|customer_phone|created_at` into:
```ts
{ customer_name, customer_phone, created_at, items: [{filename, print_size_name, quantity}] }[]
```

2. Replace the current flat `.map()` rendering (lines 423-437) with grouped cards:
   - Each card shows customer name, phone, and date in a header
   - Below: a list of their ordered items (photo filename, size, quantity)

3. Excel export remains unchanged (already uses the flat `orders` array).

No backend or database changes needed.

