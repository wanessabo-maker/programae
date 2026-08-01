/**
 * Normalização de profissões — evita duplicidade por gênero/plural.
 * Ex.: "Médico", "Médica", "Médicos", "MEDICA" -> "Médico (a)"
 *      "Engenheiro", "engenheira"             -> "Engenheiro (a)"
 */

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na']);

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function singularize(word: string) {
  if (/ões$/i.test(word)) return word.replace(/ões$/i, 'ão');
  if (/ais$/i.test(word)) return word.replace(/ais$/i, 'al');
  if (/eis$/i.test(word)) return word.replace(/eis$/i, 'el');
  if (/res$/i.test(word)) return word.replace(/res$/i, 'r');
  if (/[aeiou]s$/i.test(word) && word.length > 3) return word.slice(0, -1);
  return word;
}

/**
 * Retorna o nome canônico da profissão (com marcação de gênero quando aplicável).
 */
export function normalizeProfession(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s*\(\s*a\s*\)\s*/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;

  let gendered = false;
  const words = cleaned.toLowerCase().split(' ').map(w => {
    if (STOPWORDS.has(stripAccents(w))) return w;
    const singular = singularize(w);
    if (/[oa]$/.test(singular) && singular.length > 3) {
      gendered = true;
      return singular.replace(/a$/, 'o');
    }
    return singular;
  });

  const label = words
    .map(w => (STOPWORDS.has(stripAccents(w)) ? w : titleCase(w)))
    .join(' ');

  return gendered ? `${label} (a)` : label;
}

/** Chave de comparação (sem acento/caixa) para agrupar profissões equivalentes. */
export function professionKey(raw?: string | null): string | null {
  const norm = normalizeProfession(raw);
  return norm ? stripAccents(norm).toLowerCase() : null;
}

/** Deduplica uma lista de profissões pelo nome canônico, ordenada em pt-BR. */
export function dedupeProfessions(list: (string | null | undefined)[]): string[] {
  const map = new Map<string, string>();
  list.forEach(item => {
    const key = professionKey(item);
    const label = normalizeProfession(item);
    if (key && label && !map.has(key)) map.set(key, label);
  });
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}