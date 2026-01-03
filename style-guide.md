# RogueTris UI Style Guide

## Design Tokens
- Colors: bg #0b1220, surface #121a2b, surface-2 #182238, primary #38bdf8, accent #818cf8, success #4ade80, danger #ef4444, text #eaf1ff, muted #9fb0c9
- Spacing: 4, 8, 12, 16, 20, 24px (space-1..space-6)
- Radii: 6px (sm), 10px (md), 14px (lg)
- Stroke: 1px rgba(255,255,255,0.10/0.18)
- Shadows: shadow-1 0 2px 6px 15%, shadow-2 0 3px 8px 20%
- Motion: ease cubic-bezier(0.2,0.8,0.2,1); durations 180–300ms
- Typography: Inter (400,600,700,800), fallback system UI; titles 1.8rem, metrics 1.1rem, labels 0.8–0.9rem

## Layout
- App grid: header, content, footer in a vertical grid
- Game area: 3-column grid — controls (240px), board (1fr), sidebar (240px)
- Consistent gaps using spacing tokens
- Responsive: max width 1200px, touchpad hidden ≥768px

## Components
- Card: surface gradient, stroke-1, radius-md, shadow-1, hover lift
- Button: control-btn base; variants danger, ghost, overlay-restart; states default/hover/active/focus-visible
- Overlay: radial backdrop, overlay-inner uses surface gradient, radius-lg, shadow-2; visible toggles opacity and pointer-events
- Pool grid: bordered grid with pool-item cells, new items pulse-green
- Confirm actions: horizontal button group with auto-width buttons

## Depth & Elevation
- Use shadow-1 for inline components (cards, board wrapper)
- Use shadow-2 for overlays, modal surfaces
- Shadows limited to 2–8px blur equivalents, 15–20% opacity

## Motion
- Buttons: translateY(-1px) hover, reset on active
- Overlays: opacity transitions 300ms, eased; avoid heavy transforms
- Preview/Hold: opacity fades 200ms for 60fps compliance

## Color Usage
- Primary for CTAs, accent for secondary actions, success for unlock highlights, danger for destructive actions
- Avoid exceeding palette; use muted for labels and secondary text

## Accessibility
- Focus-visible outlines for buttons
- High contrast text on surfaces
- Larger tap targets (min 40px height for buttons)

## Implementation Notes
- All tokens defined in :root in styles.css
- Keep HTML semantic and minimize inline styles
- Preserve IDs used by game logic; add classes for styling when needed
