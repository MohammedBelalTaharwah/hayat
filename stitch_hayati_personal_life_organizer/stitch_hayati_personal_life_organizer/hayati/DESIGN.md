---
name: Hayati | حياتي
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-main:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  rtl-h1:
    fontFamily: Cairo
    fontSize: 26px
    fontWeight: '700'
    lineHeight: '1.4'
  rtl-body:
    fontFamily: Cairo
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.7'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  container_max: 1280px
  sidebar_width: 280px
---

## Brand & Style

The brand personality for this design system is centered on **clarity, composure, and intentionality**. As a personal life organizer, it aims to reduce cognitive load and provide a sense of calm control over one's daily complexity.

The visual style follows a **Corporate / Modern** aesthetic, blending high-utility SaaS patterns with a premium lifestyle feel. It prioritizes legibility and structure through a high-contrast sidebar-to-content relationship. The interface uses a clean, white "canvas" for focus, grounded by a deep navy structural foundation that communicates reliability and depth.

Key characteristics:
- **Professional & Organized:** Precise alignment and generous whitespace.
- **Bi-Directional Excellence:** Equal visual weight and care given to both LTR and RTL scripts.
- **Approachable Sophistication:** Use of soft geometry (rounded-xl) to prevent the professional tone from feeling sterile.

## Colors

The palette is designed to create a clear functional hierarchy.
- **Structural Navy (#0F172A):** Reserved exclusively for the sidebar and primary navigation elements. It serves as the "anchor" of the application.
- **Action Indigo (#6366F1):** Used for primary calls-to-action, active states, and focus indicators. It provides a modern, energetic spark against the neutral canvas.
- **Clean Canvas:** The main content area utilizes a pure white background with subtle slate borders (#E2E8F0) to maintain a crisp, airy feel.
- **Validation Palette:** Semantic colors (Red, Green, Amber) are used with moderate saturation to ensure accessibility without breaking the professional aesthetic.

## Typography

This design system employs a dual-typeface strategy to ensure native-level legibility across languages.
- **LTR (English):** Uses **Inter**, a highly legible neo-grotesque font. Tracking is slightly tightened for headlines to maintain a punchy, modern look.
- **RTL (Arabic):** Uses **Cairo**, which offers a contemporary balance between Kufi and Naskh styles, pairing perfectly with Inter’s geometric clarity.
- **Hierarchy:** Typography is scaled using a major second (1.125) ratio. Large titles are bold and dark (#1E293B), while secondary metadata uses a medium weight in slate (#64748B).

## Layout & Spacing

The layout utilizes a **Fixed-Fluid Hybrid** model:
- **Sidebar:** A fixed width of 280px. In RTL mode, this element mirrors to the right side of the viewport.
- **Main Canvas:** A fluid area with a maximum content constraint of 1280px to prevent excessive line lengths on wide monitors.
- **Grid:** A 12-column responsive grid with a 24px (lg) gutter.
- **Padding:** Content cards and modals utilize 24px internal padding to ensure elements "breathe."

When switching to RTL, all horizontal spacing tokens, margins, and flex-directions must be mirrored programmatically.

## Elevation & Depth

Depth is communicated through **Ambient Shadows** and tonal separation rather than heavy borders.
- **Level 0 (Floor):** The content background (#FFFFFF).
- **Level 1 (Cards):** Subtle, highly diffused shadows (Y: 4px, Blur: 6px, Opacity: 0.05, Color: #0F172A). This creates a sense of "resting" on the surface.
- **Level 2 (Modals/Dropdowns):** Deeper shadows (Y: 10px, Blur: 15px, Opacity: 0.1) to indicate temporary, high-priority interaction layers.
- **Sidebar Depth:** The sidebar uses color rather than shadow to denote hierarchy, appearing "behind" or "pinned" relative to the main content area.

## Shapes

The system uses a **Rounded** (Level 2) shape language to soften the professional tone.
- **Standard Cards:** `rounded-xl` (1.5rem / 24px) to create a friendly, modern container feel.
- **Buttons/Inputs:** `rounded-lg` (0.5rem / 8px) for a more precise, clickable appearance.
- **Metric Chips:** Fully rounded (pill) for status indicators and tags.
- **Checkboxes:** Small radius (4px) to maintain a classic UI feel while matching the overall softness.

## Components

### Navigation Sidebar
- **Background:** Deep Navy (#0F172A).
- **Active State:** Indigo (#6366F1) left-border (or right-border in RTL) with a subtle white text highlight.
- **Icons:** Linear, 20px, with 60% opacity for inactive states.

### Metric Cards
- **Style:** White background, `rounded-xl` corners, subtle Level 1 shadow.
- **Content:** Large display-style number, small label-caps title, and a percentage trend indicator.

### Form Fields & Validation
- **Default:** Slate-200 border, `rounded-lg`.
- **Focus:** Indigo-500 2px ring with a soft glow.
- **Error State:** Red-500 border and helper text.
- **Success State:** Green-500 border.
- **RTL:** Labels and icons must flip; text alignment defaults to right.

### Modals
- **Backdrop:** 40% opacity Navy (#0F172A) blur.
- **Container:** Centered, `rounded-xl`, Level 2 elevation, max-width 600px.

### Buttons
- **Primary:** Solid Indigo with White text.
- **Secondary:** Transparent with Indigo border and text.
- **States:** 10% darken on hover; 5% scale-down on active/click.