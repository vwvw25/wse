import type { BandSize } from '@/types/quote'

export type BandType = 'electric' | 'acoustic' | 'roaming' | 'jazz_keys' | 'jazz_guitar'

export type MusicianFeeKey =
  | 'singer_fee' | 'guitarist_fee' | 'drummer_fee' | 'bass_fee'
  | 'keys_fee' | 'sax_fee' | 'trombone_fee' | 'trumpet_fee' | 'singer_2_fee'

// Line-up description shown on quote (e.g. "Vocals, Guitar, Bass, Drums")
export const LINE_UP_LABELS: Record<BandType, Partial<Record<BandSize, string>>> = {
  electric: {
    duo:        'Vocals, Guitar',
    trio:       'Vocals, Guitar, Drums',
    quartet:    'Vocals, Guitar, Bass, Drums',
    five_piece: 'Vocals, Guitar, Bass, Keys, Drums',
    six_piece:  'Vocals, Guitar, Bass, Keys, Drums, Sax',
    seven_piece:'Vocals, Guitar, Bass, Keys, Drums, Sax, Trumpet',
    eight_piece:'Vocals, Guitar, Bass, Keys, Drums, Sax, Trumpet, Trombone',
  },
  acoustic: {
    duo:        'Vocals, Guitar',
    trio:       'Vocals, Guitar, Drums or Bass',
    quartet:    'Vocals, Guitar, Bass, Drums',
    five_piece: 'Vocals, Guitar, Bass, Keys, Drums',
    six_piece:  'Vocals, Guitar, Bass, Keys, Drums, Sax',
  },
  roaming: {
    trio:       'Vocals, Guitar, Drums',
    quartet:    'Vocals, Guitar, Upright Bass, Drums',
    five_piece: 'Vocals, Guitar, Upright Bass, Drums, Sax',
    six_piece:  'Vocals, Guitar 1, Guitar 2, Upright Bass, Drums, Sax',
  },
  jazz_keys: {
    duo:        'Vocals, Piano',
    trio:       'Vocals, Piano, Drums or Upright Bass',
    quartet:    'Vocals, Piano, Upright Bass, Drums',
    five_piece: 'Vocals, Piano, Guitar, Upright Bass, Drums',
    six_piece:  'Vocals, Piano, Guitar, Sax, Upright Bass, Drums',
  },
  jazz_guitar: {
    duo:        'Vocals, Guitar',
    trio:       'Vocals, Guitar, Drums or Upright Bass',
    quartet:    'Vocals, Guitar, Upright Bass, Drums',
    five_piece: 'Vocals, Guitar, Piano, Upright Bass, Drums',
    six_piece:  'Vocals, Guitar, Piano, Sax, Upright Bass, Drums',
  },
}

// Which fee fields (in order) apply to each size for each band type
export const MUSICIAN_FEE_KEYS: Record<BandType, Partial<Record<BandSize, MusicianFeeKey[]>>> = {
  electric: {
    duo:        ['singer_fee', 'guitarist_fee'],
    trio:       ['singer_fee', 'guitarist_fee', 'drummer_fee'],
    quartet:    ['singer_fee', 'guitarist_fee', 'drummer_fee', 'bass_fee'],
    five_piece: ['singer_fee', 'guitarist_fee', 'drummer_fee', 'bass_fee', 'keys_fee'],
    six_piece:  ['singer_fee', 'guitarist_fee', 'drummer_fee', 'bass_fee', 'keys_fee', 'sax_fee'],
    seven_piece:['singer_fee', 'guitarist_fee', 'drummer_fee', 'bass_fee', 'keys_fee', 'sax_fee', 'trombone_fee'],
    eight_piece:['singer_fee', 'guitarist_fee', 'drummer_fee', 'bass_fee', 'keys_fee', 'sax_fee', 'trombone_fee', 'trumpet_fee'],
  },
  acoustic: {
    duo:        ['singer_fee', 'guitarist_fee'],
    trio:       ['singer_fee', 'guitarist_fee', 'drummer_fee'],
    quartet:    ['singer_fee', 'guitarist_fee', 'bass_fee', 'drummer_fee'],
    five_piece: ['singer_fee', 'guitarist_fee', 'bass_fee', 'keys_fee', 'drummer_fee'],
    six_piece:  ['singer_fee', 'guitarist_fee', 'bass_fee', 'keys_fee', 'drummer_fee', 'sax_fee'],
  },
  roaming: {
    trio:       ['singer_fee', 'guitarist_fee', 'drummer_fee'],
    quartet:    ['singer_fee', 'guitarist_fee', 'bass_fee', 'drummer_fee'],
    five_piece: ['singer_fee', 'guitarist_fee', 'bass_fee', 'drummer_fee', 'sax_fee'],
    six_piece:  ['singer_fee', 'guitarist_fee', 'singer_2_fee', 'bass_fee', 'drummer_fee', 'sax_fee'],
  },
  jazz_keys: {
    duo:        ['singer_fee', 'keys_fee'],
    trio:       ['singer_fee', 'keys_fee', 'drummer_fee'],
    quartet:    ['singer_fee', 'keys_fee', 'bass_fee', 'drummer_fee'],
    five_piece: ['singer_fee', 'keys_fee', 'guitarist_fee', 'bass_fee', 'drummer_fee'],
    six_piece:  ['singer_fee', 'keys_fee', 'guitarist_fee', 'bass_fee', 'drummer_fee', 'sax_fee'],
  },
  jazz_guitar: {
    duo:        ['singer_fee', 'guitarist_fee'],
    trio:       ['singer_fee', 'guitarist_fee', 'drummer_fee'],
    quartet:    ['singer_fee', 'guitarist_fee', 'bass_fee', 'drummer_fee'],
    five_piece: ['singer_fee', 'guitarist_fee', 'bass_fee', 'keys_fee', 'drummer_fee'],
    six_piece:  ['singer_fee', 'guitarist_fee', 'bass_fee', 'keys_fee', 'drummer_fee', 'sax_fee'],
  },
}

export const BAND_TYPE_LABELS: Record<BandType, string> = {
  electric:    'Electric',
  acoustic:    'Acoustic',
  roaming:     'Roaming',
  jazz_keys:   'Jazz (keys)',
  jazz_guitar: 'Jazz (guitar)',
}

// Band sizes in display order
export const BAND_SIZES_ORDERED: BandSize[] = [
  'duo', 'trio', 'quartet', 'five_piece', 'six_piece', 'seven_piece', 'eight_piece'
]

export const BAND_SIZE_LABELS: Record<BandSize, string> = {
  duo:        'Duo',
  trio:       'Trio',
  quartet:    'Quartet',
  five_piece: 'Five piece',
  six_piece:  'Six piece',
  seven_piece:'Seven piece',
  eight_piece:'Eight piece',
}
