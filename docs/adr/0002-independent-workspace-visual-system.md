# ADR 0002: Independent workspace visual system

Status: Accepted for implementation

## Context
The user requested a redesign inspired by goldshoot0720/fengbroaiappwrite without copying. The existing workspace labels incorrectly named Appwrite, used a narrow content area, and hid all summary metrics.

## Decision
Retain the existing Next.js and SQLiteCloud workflows. Use a warm paper background, forest-green navigation and restrained amber focus treatment. Define the replacement visual system in app/workspace.css, imported after legacy module styles. Preserve module layouts while replacing shell and shared control treatments.

Use one sidebar entry per working module; tools retain their functional tabs in the content area. Remove redundant sidebar tool entries that all opened the same default tool. The former home/dashboard entries only scrolled the page and exposed no separate surface. Show summaries on data surfaces, dynamic page headings, labeled mobile navigation, and expandable CSV instructions.

## Consequences
Legacy module CSS remains available; workspace.css is the visual override authority. Data schemas and persistence do not change. Screenshot verification requires a connected browser; only build and source checks were available in this session.
