const MONTH_MAP: Record<string, number> = {
  jan: 1, janv: 1, january: 1, janvier: 1,
  feb: 2, fevr: 2, february: 2, février: 2, fevrier: 2,
  mar: 3, mars: 3, march: 3,
  apr: 4, avri: 4, april: 4, avril: 4,
  may: 5, mai: 5,
  jun: 6, juin: 6, june: 6,
  jul: 7, juil: 7, july: 7, juillet: 7,
  aug: 8, aout: 8, août: 8, august: 8,
  sep: 9, sept: 9, september: 9, septembre: 9,
  oct: 10, october: 10, octobre: 10,
  nov: 11, november: 11, novembre: 11,
  dec: 12, dece: 12, december: 12, décembre: 12, decembre: 12,
};

/**
 * Convertit n'importe quel format de date en YYYY-MM-DD.
 * Priorité : ISO > DD/MM/YYYY (contexte français) > autres.
 */
export function parseFlexibleDate(raw: string | number): string {
  const str = String(raw ?? '').trim();
  if (!str) return '';

  // ISO: YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const isoMatch = str.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (année 4 chiffres)
  const dmyMatch = str.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const dn = parseInt(d);
    if (dn > 12) {
      // d ne peut être que le jour (DD/MM/YYYY)
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Contexte français : on suppose DD/MM/YYYY par défaut
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YY (année 2 chiffres)
  const dmy2Match = str.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2})$/);
  if (dmy2Match) {
    const [, d, m, yy] = dmy2Match;
    const year = parseInt(yy) < 50 ? `20${yy}` : `19${yy}`;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // "01 décembre 2025" ou "01-Dec-2025"
  const textDmyMatch = str.match(/^(\d{1,2})[\s\-.]([a-zàâäéèêëîïôùûüçœæ]+)[\s\-.](\d{4})$/i);
  if (textDmyMatch) {
    const [, d, mName, y] = textDmyMatch;
    const key = mName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 4);
    const monthNum = MONTH_MAP[key] || MONTH_MAP[mName.toLowerCase()];
    if (monthNum) {
      return `${y}-${String(monthNum).padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // "December 01, 2025" ou "December 01 2025"
  const textMdyMatch = str.match(/^([a-zàâäéèêëîïôùûüçœæ]+)[\s.](\d{1,2})[,\s]+(\d{4})$/i);
  if (textMdyMatch) {
    const [, mName, d, y] = textMdyMatch;
    const key = mName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 4);
    const monthNum = MONTH_MAP[key] || MONTH_MAP[mName.toLowerCase()];
    if (monthNum) {
      return `${y}-${String(monthNum).padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Timestamp Unix (10 ou 13 chiffres)
  if (/^\d{10,13}$/.test(str)) {
    const ts = parseInt(str);
    const date = new Date(str.length === 10 ? ts * 1000 : ts);
    if (!isNaN(date.getTime())) {
      return toIso(date);
    }
  }

  // Dernier recours : Date.parse (attention aux ambiguïtés de locale)
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return toIso(parsed);
  }

  return str;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Convertit n'importe quel format de prix en nombre flottant.
 * Gère : "12,5" / "12.5" / "1.234,56" / "1,234.56" / "1 234,56" / "12,5 €" / "$12.50"
 */
export function parseFlexiblePrice(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;

  let str = String(raw).trim();

  // Retirer les symboles monétaires courants
  str = str.replace(/[€$£¥₹₽฿Ar]/gi, '').trim();

  const dotCount = (str.match(/\./g) || []).length;
  const commaCount = (str.match(/,/g) || []).length;

  if (dotCount > 0 && commaCount > 0) {
    // Les deux séparateurs présents : le dernier indique le séparateur décimal
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // "1.234,56" → 1234.56
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // "1,234.56" → 1234.56
      str = str.replace(/,/g, '');
    }
  } else if (commaCount === 1 && dotCount === 0) {
    const afterComma = str.split(',')[1]?.replace(/\s/g, '') || '';
    if (afterComma.length <= 2) {
      // "12,5" ou "12,50" → décimal
      str = str.replace(',', '.');
    } else if (afterComma.length === 3) {
      // "1,234" → millier (on retire la virgule)
      str = str.replace(',', '');
    } else {
      str = str.replace(',', '.');
    }
  } else if (commaCount > 1) {
    // "1,234,567" → milliers multiples
    str = str.replace(/,/g, '');
  } else if (dotCount > 1) {
    // "1.234.567" → milliers multiples
    str = str.replace(/\./g, '');
  }

  str = str.replace(/\s/g, '');
  const result = parseFloat(str);
  return isNaN(result) ? 0 : result;
}

/**
 * Extrait un taux de taxe numérique depuis n'importe quel format.
 * Exemples : "11,65%" → 11.65, "5,60%" → 5.6, "20" → 20
 */
export function parseTaxRate(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const str = String(raw).replace('%', '').trim();
  return parseFlexiblePrice(str);
}

/**
 * Convertit un texte en slug URL (a-z, 0-9, tirets).
 */
export function slugify(str: string): string {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'produit'
  );
}
