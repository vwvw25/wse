# ADR-004: PA pricing — single background price + upgrade note

**Date:** 2026-04-14  
**Status:** Accepted

## Context

Following ADR-003 (booking type simplification), all non-wedding quotes use background pricing. However, clients booking dancing events with 40+ guests need a full PA + sound engineer, which adds a meaningful cost. Two options were considered:

**Option A:** Two price columns in the quote table — "Background" and "With full PA + engineer"  
**Option B:** Single background price with an inline note about the upgrade cost

## Decision

Option B — single price with the note:

> *"If dancing with more than 40 guests, full PA + sound engineer required — add £X"*

## Reasoning

- Option A would require the quote table to grow a column, complicating the HTML, email, and text versions
- Most enquiries are background events — showing two columns for every non-wedding quote adds noise for the majority case
- The note is placed in the inclusions list where clients are already reading what is and isn't included
- £X comes directly from `pa_sound_engineer_rate` in settings — always accurate, never needs manual updating

## Consequences

- Clients who do need the full PA package see the cost clearly and can request a revised quote
- The upgrade cost is a flat figure regardless of band size — acceptable simplification at this stage
- If per-band-size PA pricing is needed in future, this note would need to become dynamic per option row (would warrant a new ADR)
