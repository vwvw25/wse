# ADR-012: PA equipment tiers — Roaming, Roaming Lite, and standard PA hire

**Date:** 2026-08-13
**Status:** Accepted

## Context

The "what's included" and "requirements" bullets on a quote (`lib/quote-items.ts`) were written for the standard case: WSE hires in a proper PA system, brings it to the venue in a vehicle, and sets it up. That standard case is where several caveats come from — a hired PA needs mains power (2×13amp sockets), needs to be loaded in and out (hence "full loading information required 2 weeks in advance"), needs a vehicle to get reasonably close to the venue ("park within 25 metres", "if the venue isn't easily accessible by car"), and above a certain guest count for a dancefloor it needs a sound engineer running it.

None of that reasoning holds for a **Roaming** booking. "Roaming" band type means the musicians carry a body-mounted, battery-powered rig (the "rolling cube") and walk around — that's the entire point of booking it. There is no PA to hire, no vehicle-loading logistics, no mains power requirement, and no meaningful "how close can we park" question, because the kit that goes into the venue is whatever a musician can wear. It also isn't a real PA in the sense of being able to play background/interval music through — a rolling cube is built for the musician's own amplification while walking, not for a client's cocktail-hour ambience.

This was discovered because a sent quote for a Roaming booking still carried the standard-PA copy verbatim — "Background PA" under what's included, the "if client is providing PA, ask for a requote" note, the dancefloor/sound-engineer upsell, and all four of the loading/parking/access requirement lines. All of that assumes gear that a Roaming booking doesn't bring.

**Roaming Lite** is a new, related band type introduced alongside this fix: same walkabout band, same lineup options as Roaming, but using 2× Bose S1 speakers set on the floor instead of body-mounted rigs. It's less mobile than full Roaming — the S1s have to be placed and stay put — but because the S1 is a genuine (if compact and portable) PA, it *can* provide background music and interval music, which the body-mounted rig can't. It's still self-contained kit the performers carry in themselves, though, so it shares Roaming's exemption from loading logistics, parking, and vehicle-access caveats.

## Decision

`lib/quote-items.ts` now branches PA-related copy on `band_type` for the booking type being rendered:

| Bullet | Standard bands | Roaming | Roaming Lite |
|---|---|---|---|
| Background PA (what's included) | Shown when applicable | **Hidden** — no hired PA | Shown when applicable — Bose S1 can carry background music |
| "If client is providing PA, ask for a requote…" | Shown when applicable | **Hidden** — nothing to swap out | **Hidden** — same reason |
| "If dancefloor focus with 40+ guests, full PA + sound engineer required…" | Shown when applicable | **Hidden** — not a PA-hire upsell path | **Hidden** — same reason |
| Music via iPad/PA during intervals | Shown when applicable | Hidden (pre-existing rule — no PA to play through) | Shown — Bose S1 can play it |
| 2 × 13amp plug sockets | Shown unless powerless/acoustic | **Hidden** — body-mounted rig is inherently powerless | Unchanged — still governed by the `is_powerless` checkbox, since a floor-standing Bose S1 setup may or may not need mains depending on the booking |
| Full loading information required 2 weeks in advance | Always shown | **Hidden** | **Hidden** |
| Based on being able to park within 25 metres… | Always shown | **Hidden** | **Hidden** |
| If the venue isn't easily accessible by car… | Always shown | **Hidden** | **Hidden** |

The distinguishing signal in code is `band_type` (per booking type, via `band_types_by_type`) — `'roaming'` vs `'roaming_lite'` vs everything else. See [RULES.md §4/§5](../../RULES.md) for the full up-to-date condition table this feeds.

## Reasoning

- The suppressed copy isn't a display preference — each line is describing physical logistics (mains power, loading, vehicle access, a hired PA rig) that a walkabout booking structurally doesn't have. Showing it isn't just noise, it's incorrect information going to a client.
- Roaming vs Roaming Lite is a genuine equipment difference (body-mounted vs floor-standing Bose S1), not a naming variant — that's why it's a distinct `band_type` rather than a flag on Roaming, and why exactly one bullet ("Background PA") differs between the two.
- The plug-socket requirement is left keyed to the existing `is_powerless` checkbox for Roaming Lite rather than hard-suppressed, because unlike Roaming's rig, whether a Bose S1 setup needs mains isn't structurally fixed — it depends on the specific booking (battery packs vs mains adapter), so the admin's per-quote judgement call should still apply.

## Consequences

- Any future band type that isn't a standard hired-PA setup (e.g. a hypothetical bigger "Roaming Pro" rig) should be reasoned about the same way: ask which of these bullets describes gear/logistics that band type actually has, don't just copy the Roaming or standard list wholesale.
- This is also intended as a reference for future automated agents deciding what belongs on a quote: the rule isn't "roaming quotes are shorter", it's "each bullet maps to a physical fact about the equipment being brought" — check the equipment reality for a given band type before assuming a bullet applies.
- If a third PA tier is ever added, extend the table above and the `lib/quote-items.ts` branching rather than adding another one-off boolean.
