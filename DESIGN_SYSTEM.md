# Attendrix Design System

Last reviewed: 2026-02-05

## Visual Language

Attendrix uses Neo-Brutalism: high contrast, bold borders, hard shadows, and uppercase typography. Layouts favor clear hierarchy and tactile UI feedback.

## Tokens

### Colors

Defined in `tailwind.config.ts`:

- `main`: `#FFD02F` (brand yellow), hover `#E5B800`
- `paper`: `#fffdf5` (off-white background)
- `dark`: `#0a0a0a` (near-black)
- Semantic tokens map to CSS variables for shadcn compatibility:
  - `background`, `foreground`, `border`, `input`, `ring`
  - `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`

### Typography

- Display: `Space Grotesk`
- Sans: `Inter`
- Mono: `JetBrains Mono`
- Frequent uppercase, bold, and tracking-based emphasis

### Borders

- Default border width: `2px`
- Additional border width: `3px`
- Square corners by default (`borderRadius: 0`)

### Shadows

- `shadow-neo`: `4px 4px 0 0 #000`
- `shadow-neo-lg`: `8px 8px 0 0 #000`
- `shadow-neo-xl`: `12px 12px 0 0 #000`

### Motion

- Subtle transitions with `transition-colors` and `transition-shadow`
- Animated progress stripes: `progress-stripes` keyframes

## Spacing

- Tailwind spacing scale is used consistently.
- Common vertical rhythm uses 8, 12, 16, 24px increments.

## Core Components

Located in `src/components/ui`:

- `Button` and `NeoBrutalButton`
- `Card`
- `Badge`
- `Dialog`
- `Tabs` and navigation elements
- `Calendar`
- `Loader`

## Layout Patterns

- Cards with bold headers and action rows
- Lists with right-arrow affordances for navigation
- Focus-visible outlines and keyboard navigation support

## Accessibility

- High contrast colors with focus rings
- Keyboard-friendly tabs, dialogs, and buttons
- Motion uses short, non-distracting transitions
