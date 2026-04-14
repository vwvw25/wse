# ADR-002: Quote calculation as a pure function

**Date:** 2026-04-14  
**Status:** Accepted

## Context

The quote pricing logic is the most complex part of the system — it accounts for musician fees, PA type, set configuration multipliers, travel, accommodation, location surcharges, waiting time, and more. This logic needs to run on the server (when saving a quote), in the browser (live builder), and potentially in API routes.

## Decision

All pricing logic lives in a single pure function `calculate(inputs: QuoteInputs, settings: Settings): QuoteCalculated` in `lib/calculations.ts`. No side effects, no database access, no framework dependencies.

## Reasoning

- The live quote builder needs real-time recalculation on every input change — a pure function is trivial to call on each keystroke
- A `settings_snapshot` is stored alongside every quote so historical quotes can be re-rendered accurately even after settings change
- Pure functions are easy to reason about and test — inputs in, outputs out
- The same function runs identically on the server (API routes, server actions) and client (builder)

## Consequences

- All pricing configuration (margins, PA rates, set multipliers etc.) must be passed in explicitly via the `Settings` object — the function cannot read from the database itself
- `QuoteInputs` must be comprehensive enough to represent every variable that affects price, which makes it a large type — acceptable given it is also the persistence format
- Adding a new pricing factor requires updating `QuoteInputs`, `QuoteCalculated`, and `calculate()` — three places, but all in one file
