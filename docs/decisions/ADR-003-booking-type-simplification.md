# ADR-003: Simplify booking types to Wedding / Other

**Date:** 2026-04-14  
**Status:** Accepted

## Context

The original system had four booking types: Background, Dancing (under 40 guests), Dancing (over 40 guests), and Wedding. Agents frequently omit whether an event is for background music or dancing, and the guest count is often unknown at enquiry stage.

The distinction between the three non-wedding types is almost entirely about PA configuration:
- Background / Dancing under 40 → background PA setup
- Dancing over 40 → full PA + sound engineer (significant cost difference)

Requiring this classification at quote creation caused two problems:
1. Agents couldn't self-serve or provide enough information to classify
2. Any future email-parsing agent would need to classify correctly to generate a valid quote

## Decision

Step 1 of the quote builder now offers only two options: **Wedding** and **Other**. "Other" maps to `background` internally. All non-wedding quotes are priced at background rates and include an inclusion note:

> *"If dancing with more than 40 guests, full PA + sound engineer required — add £X"*

where £X is pulled live from the `pa_sound_engineer_rate` setting.

Wedding is always explicit (agents always state it) and pricing/PA requirements differ enough to warrant separate handling.

## Reasoning

- Removes a classification decision that agents don't give us the information to make
- A single quote now covers background and most dancing scenarios — the client self-selects
- The upgrade cost is transparent in the quote itself
- Simplifies any future automation: an agent only needs to detect "wedding" vs everything else

## Consequences

- Quotes no longer distinguish between background and dancing in their heading or inclusions (intentional)
- The `dancing_under_40` and `dancing_over_40` booking types remain in the codebase for backward compatibility with existing quotes, but are no longer created by the UI
- The PA upgrade note pulls from settings, so if `pa_sound_engineer_rate` changes the note stays accurate without editing quotes
