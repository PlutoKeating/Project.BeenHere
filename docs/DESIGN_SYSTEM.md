---
name: Project.BeenHere
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#4a4640'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ed'
  outline: '#7b766f'
  outline-variant: '#ccc6bd'
  surface-tint: '#605e5c'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1a'
  on-primary-container: '#868382'
  inverse-primary: '#cac6c4'
  secondary: '#ab3333'
  on-secondary: '#ffffff'
  secondary-container: '#ff716c'
  on-secondary-container: '#70040f'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001e2d'
  on-tertiary-container: '#6a889b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6e2df'
  primary-fixed-dim: '#cac6c4'
  on-primary-fixed: '#1c1b1a'
  on-primary-fixed-variant: '#484645'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ae'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#8a1b1e'
  tertiary-fixed: '#c8e7fc'
  tertiary-fixed-dim: '#accbe0'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#2d4a5c'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  display-lg:
    fontFamily: Noto Serif SC
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Noto Serif SC
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 30px
    letterSpacing: 0.01em
  body-base:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 26px
  label-archive:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  stamp-seal:
    fontFamily: Noto Serif SC
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.15em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 48px
  max-content-width: 720px
  section-gap: 64px
---

## Brand & Style

The brand personality is **Quiet, Restrained, Warm, and Solemn**. This design system is not a social platform; it is a digital sanctuary for the preservation of ordinary lives. It operates on the principle of "Warm Sophistication" (温柔高级感), treating the ephemeral digital trace as a permanent historical artifact.

The design style combines **Minimalism** with **Tactile / Skeuomorphic** elements inspired by physical archives. It utilizes heavy whitespace to create intentional friction—slowing down the user to encourage contemplative reading rather than rapid consumption. Every element should feel like it was carefully placed on a museum specimen plate or a library catalog card.

- **Randomness & Equality:** Every archive entry has identical visual gravity.
- **Truth & Solemnity:** No popularity metrics, "likes," or algorithmic bias.
- **Physical Metaphors:** Use of hairline borders, archival stamps, and paper-like textures to evoke a sense of permanence and touch.

## Colors

The palette is rooted in the material world of physical preservation.

- **Primary (Soot Ink Black):** Used for typography and primary structural elements. It mimics the density of traditional carbon ink.
- **Secondary (Cinnabar Stamp Red):** Reserved for official seals, stamps, and solemn state confirmations. It represents the "Archive Stamp."
- **Tertiary (Cyanotype Blue):** Used for links and metadata, referencing the historical blue of architectural blueprints and archival labels.
- **Neutral (Warm Parchment):** The base canvas. Unlike a sterile digital white, this color provides a gentle, reflective warmth similar to untreated cotton paper.

Avoid using pure black (#000) or pure white (#FFF) for content; stick to the parchment and ink hierarchy to maintain the analog atmosphere.

## Typography

The typography system pairs authoritative classical serifs with exceptionally legible modern sans-serifs, grounded by monospaced figures for archival precision.

- **Headings & Display:** Use **Noto Serif SC** (or Playfair Display) to convey historical gravity and literary quality.
- **Body Text:** Use **Inter** for high readability. The line-height for `body-lg` is intentionally generous (30px) to facilitate focus and reduce eye strain during long-form reading.
- **Metadata & Serial IDs:** Use **JetBrains Mono**. All dates, archive numbers (e.g., ARCHIVE #00821), and hashes must use monospaced fonts to ensure horizontal alignment in lists and avoid "jitter."
- **Content Constraint:** For reading views, the line length should never exceed 720px (approx. 35 characters) to maintain an optimal reading rhythm.

## Layout & Spacing

The layout philosophy follows a **fixed grid** model for discovery and a centered, focused **content column** for reading.

- **Desktop:** Use a 12-column grid. The max container width for navigation and catalogs is 1140px. However, for the primary "Archive Reading Mode," the content is centered and restricted to a **720px** column.
- **Mobile:** A single-column layout with 20px side margins. 
- **Vertical Rhythm:** Use generous whitespace between sections (64px to 96px) to signify the transition between different "exhibits" or archive entries.
- **Alignment:** Use asymmetrical layouts occasionally for metadata to mimic the way notes are scribbled in the margins of physical files.

## Elevation & Depth

This design system avoids the use of heavy shadows or "floating" elements common in modern SaaS. Instead, it utilizes **Tonal Layers** and **Low-contrast Outlines**.

- **Surface Layering:** The primary canvas is Warm Parchment (#FAF8F5). Elevated components (like library cards) use pure white (#FFFFFF) with a 1px border (#DDD7CC).
- **Depth Metaphor:** Elements should feel like they are stacked on a table. If a shadow is necessary for a "Drift" modal, it should be an extremely diffused, low-opacity ambient shadow: `0 2px 8px rgba(28, 27, 26, 0.04)`.
- **Borders:** Use hairline 1px strokes in "Sand" (#DDD7CC) to define boundaries. This mimics the trimmed edge of physical paper.

## Shapes

The shape language is primarily **Soft (Level 1)**. 

While the archive is modern, it respects the geometry of physical library catalog cards and paper clippings. 
- **Standard Radius:** 0.25rem (4px) for most containers, buttons, and cards.
- **Stamp Radius:** Circular or square with a 2px radius to emulate the imperfections of a physical ink stamp.
- **Pill Shapes:** Reserved exclusively for status indicators like "Verified" or "Active," but used sparingly to avoid looking too "app-like."

## Components

### Buttons
- **Primary (Drift Action):** Sharp rectangular corners (4px radius), Soot Ink background, Parchment text. No gradients.
- **Secondary:** Transparent background with a 1px border (#8C867D). Hover state fills with a light parchment tint.

### Archival Index Cards
- Used for presenting interview snippets. Must include a header strip with a monospaced Serial Number (e.g., #821) and a Cinnabar Stamp in the top right corner. 

### Archive Seals (Stamps)
- A key brand element. It is a text-based badge (e.g., "已入馆" or "来过") enclosed in a double hairline border. Apply a subtle 2-3 degree rotation to the element to simulate a manual stamp application.

### Interview Silence Markers
- A distinct visual divider for "Story Mode." It consists of a thin horizontal line with centered serif text in italics, indicating the duration of a pause (e.g., *— Silence for 3 hours —*).

### Input Fields
- Minimalist design. Only a bottom border (#8C867D) is shown by default. The label uses the Monospace font to feel like a form being filled out on a typewriter.

### Projection Switcher
- A segmented control at the top of records to toggle between "Story," "Conversation," and "Record" views. It should use sharp edges and high-contrast fill for the active state to resemble tabbed folder dividers.