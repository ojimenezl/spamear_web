/**
 * Specs alineadas con el tamaño REAL en pantalla (CSS vars en styles.css).
 * `upload*` = ×3 del display aproximado, para que se vea nítido.
 */

export const CARD_IMAGE_SPEC = {
  /** Zona de imagen en pantalla (CSS --card-photo-h × --card-w aprox.) */
  displayW: 158,
  displayH: 96,
  width: 474,
  height: 288,
  label: '474 × 288 px',
  hint: 'En pantalla la foto mide ~158×96 px (misma en el muro y en el ejemplo). Sube al menos 474×288.',
  preview: 'card',
  size: 'card',
}

export const TOP10_IMAGE_SPEC = {
  width: 540,
  height: 120,
  label: '540 × 120 px',
  hint: 'Hueco Top 10 ≈ 180×40 en pantalla. Sube al menos 540×120.',
  preview: 'top10',
  size: 'top10',
}

/** Display size + upload hint por slot (mismas keys que en DB). */
export const BANNER_IMAGE_SPECS = {
  'strip-top': {
    width: 264,
    height: 102,
    label: '264 × 102 px',
    hint: 'En pantalla: 88×34 (junto al logo).',
    preview: 'mini',
    size: 'mini',
  },
  'left-1': tallSpec('izquierda'),
  'left-2': tallSpec('izquierda'),
  'left-3': tallSpec('izquierda'),
  'circle-a': tallSpec('derecha'),
  'circle-b': tallSpec('derecha'),
  'circle-c': tallSpec('derecha'),
  'circle-d': tallSpec('derecha'),
  'foot-1': footSpec(),
  'foot-2': footSpec(),
  'foot-3': footSpec(),
  'foot-4': footSpec(),
}

function tallSpec(side) {
  return {
    width: 288,
    height: 900,
    label: '288 × 900 px',
    hint: `En pantalla: 96×~1/3 del alto (columna ${side}). Misma caja que el preview.`,
    preview: 'tall',
    size: 'tall',
  }
}

function footSpec() {
  return {
    width: 720,
    height: 252,
    label: '720 × 252 px',
    hint: 'En pantalla: ~1/4 del muro × 84 px de alto. Misma caja que el preview.',
    preview: 'foot',
    size: 'foot',
  }
}

export function bannerSpec(slotKey) {
  return BANNER_IMAGE_SPECS[slotKey] || BANNER_IMAGE_SPECS['left-1']
}

export function formatSpec(spec) {
  if (!spec) return ''
  return `${spec.width} × ${spec.height} px`
}
