# Frontend Theme Design System (Cursor-Inspired - Light Mode Only)

## Design Philosophy
**"Intelligence in Simplicity"**

The design aims to mimic the sophisticated, functional, and distraction-free aesthetic of the Cursor IDE website. It prioritizes content readability, visual hierarchy through spacing rather than color, and a "engineered" feel.

## Core Visual Principles
1.  **Monochromatic Foundation:** The UI is built on a scale of grays, from stark white/black to subtle off-whites and charcoals. Color is used *extremely* sparingly, reserved only for primary actions (CTAs) or critical status indicators.
2.  **Sharp & Precise:** Border radii are tight (4px - 6px), evoking a sense of precision tool-making. Shadows are subtle, often used to create depth without "floating".
3.  **Typography-Driven:** Hierarchy is established through font weight and size, not color. We use a high-quality sans-serif font (Inter or Geist Sans).
4.  **No Gradients:** Flat, solid colors. No background gradients.
5.  **High Density vs. Breathing Room:** Information density is high where needed (dashboard lists), but page layout allows for significant breathing room (margins/padding).

## Color Palette (Light Mode Only)

-   **Background:** `#FFFFFF` (Pure White)
-   **Surface/Card:** `#FAFAFA` (Zinc-50) or `#FFFFFF` with a subtle border.
-   **Border:** `#E4E4E7` (Zinc-200)
-   **Text Primary:** `#09090B` (Zinc-950) - Nearly black.
-   **Text Secondary:** `#71717A` (Zinc-500) - Medium gray for meta-data.
-   **Text Tertiary:** `#A1A1AA` (Zinc-400) - Placeholders or disabled text.
-   **Primary Action:** `#18181B` (Zinc-900) [Black Button]
-   **Primary Foreground:** `#FAFAFA` (Zinc-50) [White Text on Button]
-   **Destructive:** `#EF4444` (Red-500) - Use sparingly.

## Typography
-   **Font Family:** `Inter` (via `next/font/google`)
-   **Headings:** Tight tracking (`-0.02em`), bold weights.
-   **Body:** Standard tracking, regular weights.

## Components (Shadcn/ui)

-   **Buttons:**
    -   *Primary:* Solid Black (`bg-zinc-900 text-zinc-50`). Sharp corners or small radius (`rounded-md`).
    -   *Secondary:* White with Border (`bg-white border border-zinc-200 text-zinc-900`).
    -   *Ghost:* Hover effect only (`hover:bg-zinc-100`).
-   **Cards:** Flat background, 1px border (`border-zinc-200`), minimal shadow (`shadow-sm`).
-   **Inputs:** Minimal border (`border-zinc-200`), subtle focus ring (`ring-zinc-900`).

## CSS Variables (Tailwind Config)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.375rem;
}
```
