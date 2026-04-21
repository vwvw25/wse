# ADR-009: Musician availability UX — confirmation flow and celebration GIFs

**Date:** 2026-04-21  
**Status:** Accepted

## Context

When a musician responds "Yes, I'm available" via the token-based availability page, the experience was underwhelming — they were shown the same event details card with a green banner. There was also no confirmation email sent to the musician after they accepted.

## Decision

### Confirmation autoresponder
When a musician clicks "Yes, I'm available", a confirmation email is sent automatically containing:
- Full event details (venue, date, times, role)
- Google Calendar deep-link
- iCal download link (`/api/ical/[token]`)
- A note to get in touch if dietary or personal details have changed

The email is sent inside a try/catch — failure does not block the redirect.

### Celebration GIF success screen
The "yes" success state replaces the standard card with a full-screen dark page showing a randomly selected GIF. GIFs are managed in Settings → Celebration GIFs (add by URL, delete with trash icon). Giphy page URLs (`giphy.com/gifs/…`) are auto-converted to direct media URLs (`media.giphy.com/media/…/giphy.gif`) on save.

If no GIFs are configured, the page falls back to a 🎉 emoji.

The "no" response retains the standard confirmation card.

### Availability status labels
`email_sent` displays as **Invite sent** and `reminder_sent` displays as **Reminder sent** in the event musicians UI — clearer language than the previous "Email Sent" / "Reminder Sent".

## Consequences

- `celebration_gifs` table stores GIF URLs (uuid, url, created_at).
- `/api/admin/celebration-gifs` GET/POST and `/api/admin/celebration-gifs/[id]` DELETE manage the list.
- The availability page fetches GIFs server-side and picks randomly at render time.
- Settings → Email templates section allows test sends of all 7 email templates to a configured address.
