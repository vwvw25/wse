import type { CSSProperties } from 'react'

// Email templates deliberately have no font / font-size controls: every email
// WSE sends is composed in Gmail, which renders message bodies in Arial at its
// "Normal" size. Templates are authored and previewed in that same font so what
// you see in the app matches what the recipient sees. Keep these values in sync
// with Gmail's default message body styling.
export const GMAIL_FONT_FAMILY = 'Arial, Helvetica, sans-serif'
export const GMAIL_FONT_SIZE = 14
export const GMAIL_LINE_HEIGHT = 1.5

export const gmailBodyStyle: CSSProperties = {
  fontFamily: GMAIL_FONT_FAMILY,
  fontSize: GMAIL_FONT_SIZE,
  lineHeight: GMAIL_LINE_HEIGHT,
}
