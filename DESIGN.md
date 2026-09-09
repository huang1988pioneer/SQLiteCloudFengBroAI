---
name: 鋒兄 AI
description: A warm paper and forest-green workspace for everyday personal records.
colors:
  primary: "#28634e"
  primary-deep: "#1d4d3c"
  navigation-active: "#284e3d"
  paper: "#f5f4ef"
  surface: "#fffefa"
  surface-strong: "#eeefe8"
  sidebar: "#e9ede3"
  ink: "#233c34"
  muted: "#64716a"
  line: "#d7ddd3"
  line-soft: "#e8ece3"
  focus: "#a56b19"
typography:
  display:
    fontFamily: '"Inter", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif'
    fontSize: "clamp(26px, 3vw, 36px)"
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Inter", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif'
    lineHeight: 1.6
  navigation:
    fontSize: "13px"
    fontWeight: 550
rounded:
  control: "8px"
  card: "12px"
  panel: "14px"
spacing:
  compact: "8px"
  mobile: "16px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
---

# Design System: 鋒兄 AI

## Overview

The implemented direction is warm paper and forest ink: quiet surfaces, readable Traditional Chinese, and clear navigation around practical daily records. Preserve the 鋒兄 name. The user supplied the fengbroaiappwrite repository as a style reference, with an explicit requirement to create a distinct implementation rather than copy it.

This document records the source implementation in `app/workspace.css`, its base styles in `app/globals.css`, and the workspace composition in `app/page.tsx`. It describes implemented choices, not user-approved visual QA; browser screenshots and visual approval were unavailable during this pass.

**Key Characteristics:**

- Warm white content surfaces against a pale sage sidebar.
- Forest-green active navigation and primary actions.
- Wide working space, contextual page titles, and restrained summary metrics.
- Thin dividers and tonal grouping instead of heavily elevated containers.

## Colors

### Primary

Forest green identifies primary actions, links, and selected states. Its deeper variant provides button hover feedback; the separate navigation-active tone anchors the sidebar and tool selections.

### Neutral

Paper is the page background; surface is the content and input background. Surface-strong separates tabs and supporting regions. Sidebar provides a persistent pale sage navigation field. Ink carries primary text, muted supports descriptions, and the two line tones divide sections without dominating them.

The warm amber focus color is reserved for a visible keyboard outline. Existing domain-specific status colors remain separate from the primary brand accent.

## Typography

Display and body share the declared Inter / Noto Sans TC / Microsoft JhengHei / system sans-serif stack; font availability depends on the runtime environment. The page title uses the fluid display token, while tool section headings use a smaller title size (21px). Supporting page copy uses generous leading (1.8) and a bounded line length (65ch).

Navigation labels use the compact navigation token. Numeric metrics and table values use tabular figures; metric values step from desktop (26px) to mobile (20px). Preserve readable Traditional Chinese labels instead of introducing uppercase decorative text.

## Layout

Desktop uses a sticky full-height sidebar (244px) and a flexible content column. The workspace is capped at 1480px, with horizontal padding that scales from 20px to 48px. A quiet context bar precedes the current section title and description. Record sections show three summary metrics; tools and settings omit that metric strip.

Between 761px and 1120px, the sidebar contracts to an icon rail (76px). At 760px and below, navigation becomes a horizontal scrolling row with visible labels, and workspace padding becomes 16px. Module tabs scroll horizontally; tool tabs use two columns. Mobile record rows retain field labels, including subscription-specific labels, while empty rows suppress generated labels.

Panel interiors generally use 24px padding, reduced to 16px horizontal padding on mobile. Group related controls within the working panel and keep one clear page title rather than repeating module headings.

## Elevation & Depth

The shell, sidebar, and main panels are flat. Pale background changes and thin borders express grouping. Selected module tabs retain a small shadow (`0 2px 5px rgb(35 60 52 / 7%)`); the shared ambient shadow token is `0 12px 32px rgb(35 60 52 / 7%)` where inherited components use it. Food and bank card hover states change border treatment without lifting the card.

## Shapes

Controls use gently rounded corners, cards a softer radius, and module panels a slightly larger enclosing radius, as recorded in the frontmatter. The sidebar meets the viewport edge without an outer rounded frame. The brand mark has a distinctive asymmetric corner treatment (12px 12px 4px 12px).

## Components

- **Buttons:** Forest primary fill with white text; darker hover. The recorded button height is a minimum, increasing to 44px for mobile actions. Color and border transitions take 160ms. Disabled buttons use a not-allowed cursor.
- **Navigation:** Quiet green-gray labels and outline icons become cream-on-forest when active. Hover adds a pale sage background. Navigation buttons expose accessible names and the active page state, including on the tablet icon rail.
- **Cards and panels:** Warm surface, thin neutral border, restrained corner rounding, and minimal shadow. Tool sections use dividers rather than additional nested card frames.
- **Fields:** Warm surface, neutral stroke, rounded controls, green caret, and visible placeholder text. Text inputs have a minimum height of 42px. Keyboard focus uses a 3px amber outline with a 3px offset.
- **Metrics:** Three values share one pale summary strip, separated by vertical rules. Their content follows the selected record module.
- **Tables and empty states:** Pale sage headers, tabular values, gentle row hover, and centered empty-state copy. Preserve meaningful field labels when rows reflow on mobile.
- **CSV guidance:** Native expandable details keep format instructions available without taking over the working area.
- **Feedback:** Forest toast with cream text and viewport-bounded width. Reduced-motion preferences disable CSS animation, transitions, and CSS smooth scrolling; imperative scrolling should be checked separately.

## Do's and Don'ts

- **Do** reuse semantic color roles and the existing Traditional Chinese visual hierarchy.
- **Do** preserve labeled mobile navigation, visible keyboard focus, and mobile action targets of at least 44px.
- **Do** retain contextual titles and summaries while giving forms and records most of the page width.
- **Don't** copy the reference application's identity or assets wholesale.
- **Don't** reintroduce duplicate module headings, prominent nested shadows, or lifting food/bank card hover effects into this workspace treatment.
- **Don't** treat source-level checks as proof of browser rendering, contrast compliance, or completed visual approval.
