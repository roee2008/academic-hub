---
name: Academic Workspace & Aggregator
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  sidebar-width: 16rem
  panel-min-width: 20rem
  gutter-desktop: 1.5rem
  gutter-mobile: 0.75rem
---

## Brand & Style

The design system is engineered for high-agency students, researchers, and multidisciplinary academics who juggle high volumes of coursework across fragmented Google Workspaces, native drives, and personal task backlogs. The emotional core is calm mastery, cerebral precision, and frictionless execution. It strips away academic clutter in favor of a sleek, dark productivity environment reminiscent of modern developer tools and professional command centers.

### Visual Aesthetic & Movements
- **Linear-Grade Dark Ergonomics:** Deep, atmospheric slate surfaces with hairline neutral borders (#243048) create a quiet, distraction-free canvas tailored for prolonged study sessions under low ambient light.
- **Accented Course Chromatics:** A disciplined system of jewel-toned neon indicators (electric indigo, emerald, amber, violet, and cyan) maps across accounts and courses, providing instant cognitive anchoring without visual exhaustion.
- **Structured Density:** Information hierarchy is compact, sharp, and keyboard-first, celebrating typographic discipline, clear micro-interactions, and instant legibility over ornamental fluff.

## Colors

The palette establishes an ultra-refined dark spectrum where information takes precedence and pure blacks are avoided to prevent optical strain and harsh contrast clipping.

### Base Tones & Surfaces
- **Base Canvas (`#0B0F17`):** The primary view boundary; infinite, deep midnight slate that grounds panels and window chrome.
- **Surface Layer 1 (`#111827`):** Sidebars, document list panels, and navigational drawers.
- **Surface Layer 2 (`#1A2234`):** Cards, modal panels, active row items, flyouts, and command palette shells.
- **Structural Stroke (`#243048`):** 1px borders delineating frames, tables, and compartmentalized widgets with surgical clarity.

### Course & Account Accent Chromatics
Accents are used strictly for telemetry, source tagging (e.g., Google Classroom Account A vs. Account B, Drive syncing), and urgency indicators:
- **Electric Indigo (`#6366F1`):** Primary system actions, selected tab states, core computer science / mathematics subjects.
- **Emerald Green (`#10B981`):** Completed tasks, synchronized states, life sciences / natural sciences.
- **Warm Amber (`#F59E0B`):** Impending deadlines, flagged submissions, humanities / literature.
- **Deep Violet (`#8B5CF6`):** Secondary user profiles, studio arts, auxiliary research streams.
- **Vibrant Cyan (`#06B6D4`):** Google Drive live files, shared peer resources, engineering domains.

### Text & Icon Tokens
- **Text Primary (`#F8FAFC`):** Direct display text, titles, task titles, active statuses.
- **Text Muted (`#94A3B8`):** Metadata, course codes, timestamps, secondary navigation links.
- **Text Dim (`#64748B`):** Inactive placeholders, hotkey shortcuts, breadcrumb dividers.

## Typography

The typographic hierarchy pairs **Plus Jakarta Sans** for crisp, geometric headers with the structural neutrality of **Inter** for high-density academic lists, tables, and long-form syllabi readings.

### Hierarchy & Functional Roles
- **Headlines (Plus Jakarta Sans):** Crafted with tight tracking to evoke modern editorial tooling. `headline-xl` and `headline-lg` anchor workspace dashboards and course portals.
- **Body & Data (Inter):** Optimized for dense scan patterns. Font sizes default to `13px` (`body-md`) and `12px` (`body-sm`) for unified schedule rows, Google Drive multi-file tables, and collapsible assignment threads.
- **Metadata & Badges (Inter & JetBrains Mono):** Badges, keyboard accelerators, and course IDs use `label-sm` and `code-sm` with slight uppercase tracking (`0.03em`) for instant parsing in dark mode.

## Layout & Spacing

The layout is built on a 4px/8px modular scale designed for high-information-density desktop workflows, featuring responsive reflow patterns for mobile companion views.

### Structural Framework
- **Multi-Pane Workspace Grid:** Three-pane structure featuring:
  1. Persistent collapsed/expanded Navigation Sidebar (`16rem`).
  2. Contextual list/feed pane (Assignments, Unified Drive index, Calendar).
  3. Detail / Focus Pane (Document reader, assignment submissions, markdown scratchpad).
- **Responsive Adaptations:**
  - **Desktop (≥ 1280px):** 3 full panes side-by-side, zero layout thrash, hairline dividers without outer card margins.
  - **Tablet (768px - 1279px):** Sidebar collapses into a 48px icon rail; primary list and detail panes toggle via slide-over overlay.
  - **Mobile (< 768px):** Single-pane linear stack. Bottom navigation bar replaces the sidebar; nested navigation uses stack pushes with fluid 12px horizontal page padding (`gutter-mobile`).

## Elevation & Depth

Visual depth is achieved through **tonal layering and razor-sharp border delineation** rather than soft, fuzzy dropshadows, ensuring maximum interface clarity in low-light workspaces.

### Elevation Hierarchy
- **Base Level 0 (`#0B0F17`):** Primary canvas. No border, raw canvas.
- **Surface Level 1 (`#111827`):** Nested structural containers and side rails bordered by `1px solid #243048`.
- **Surface Level 2 (`#1A2234`):** Cards, hovering list items, and segment pickers. Receives a faint inner highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.04)`) to simulate bevel precision.
- **Floating Overlays & Modals (`#1A2234`):** Command palettes (`Cmd + K`), contextual dropdowns, and file previewers. Uses a high-performance, directional ambient shadow: `0 16px 36px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px #243048`.

### Backdrops & Translucency
Sticky headers and active filter bars use `backdrop-filter: blur(12px)` over an 85% alpha-blended surface (`rgba(17, 24, 39, 0.85)`), letting rich course accent dots blur subtly beneath scrolling content.

## Shapes

The design system employs a disciplined, soft geometric shape language (`roundedness: 1`). Controlled radiuses reinforce the technical, tool-like precision of the workspace while avoiding unrefined harshness.

### Corner Radii Guidelines
- **Micro Radii (`0.25rem` / 4px):** Checkboxes, status indicator pills, keyboard command badges (`kbd`), inline file tags.
- **Standard UI Radii (`0.375rem` - `0.5rem` / 6px - 8px):** Buttons, inputs, drop-down menus, task rows, and inner panel segments.
- **Surface Containers (`0.75rem` / 12px):** Modals, preview dialogs, and detached workspace dashboard cards.
- **Interactive Focus Rings:** Custom 2px outline with `2px` offset using `rgba(99, 102, 241, 0.5)`.

## Components

### Buttons
- **Primary:** Solid Electric Indigo background (`#6366F1`), text `#FFFFFF`, subtle top inner border `rgba(255, 255, 255, 0.2)`. On hover: `#4F46E5`.
- **Secondary:** Surface background (`#1A2234`), 1px solid border (`#243048`), text `#F8FAFC`. On hover: `#243048` border with brightened background (`#202B42`).
- **Ghost / Tool:** Transparent background, text `#94A3B8`. Hover: `rgba(255, 255, 255, 0.05)`, text `#F8FAFC`.

### Status Badges & Course Chips
- **Course Identifier Badges:** Compact pills with an alpha-tinted background matching the course chromatic tone (e.g., Electric Indigo at 12% opacity: `rgba(99, 102, 241, 0.12)`), text rendered in full-saturation accent (`#818CF8`), accompanied by a 6px solid circular dot.
- **Sync / Source Tag (Classroom / Drive):** Hairline bordered chip (`#243048`) with `code-sm` font. Shows account avatar or official Google service micro-glyph next to the resource name.

### Data Lists & Feed Rows
- **List Items (Assignments / Files):** Height 40px–48px. Base background is transparent. Hover triggers `#111827` transition with 1px border highlight. 
- **Row Columns:** Explicit CSS Grid spanning status icon, course dot, title, deadline label, and quick-action menu (Drive shortcut, Classroom link).

### Form Inputs & Search Fields
- **Omnibox / Search:** `#111827` fill with 1px border `#243048`. Inset `0.5rem 0.75rem`. Displays contextual hotkey trigger `⌘K` on the right side.
- **Checkboxes:** Custom square (`16px × 16px`), 4px border radius. Border is `#243048`. Checked state turns `#6366F1` with a sharp SVG checkmark.

### Academic Cards
- **Assignment / Schedule Card:** Background `#111827`, border `1px solid #243048`, padding `1rem`. Incorporates a vertical left border accent (3px width) dynamically color-coded to the associated course accent (e.g., `#10B981` for Biology).