export interface ParsedQuery {
  text: string[];
  tags: string[];
  dateGte?: string;
  dateLte?: string;
}

export function parseQuery(input: string): ParsedQuery {
  const result: ParsedQuery = { text: [], tags: [] };
  const tokens = input.trim().split(/\s+/);
  for (const token of tokens) {
    if (!token) continue;
    const tagMatch = token.match(/^tags?:(.+)$/i);
    if (tagMatch) {
      const [, tagValue] = tagMatch;
      result.tags.push(tagValue);
      continue;
    }
    const dateGte = token.match(/^date>=?:(.+)$/i);
    if (dateGte) {
      const [, dateGteValue] = dateGte;
      result.dateGte = dateGteValue;
      continue;
    }
    const dateLte = token.match(/^date<=?:(.+)$/i);
    if (dateLte) {
      const [, dateLteValue] = dateLte;
      result.dateLte = dateLteValue;
      continue;
    }
    result.text.push(token);
  }
  return result;
}

export function toSQL(q: ParsedQuery, tableExpr: string): string {
  const textConditions = q.text.map((t) => {
    const escaped = t.replaceAll("'", "''");
    return `(Title ILIKE '%${escaped}%' OR Description ILIKE '%${escaped}%' OR list_contains(Keywords, '${escaped}') OR list_contains(Tags, '${escaped}'))`;
  });
  const filterConditions: string[] = [];
  if (textConditions.length > 0) filterConditions.push(`(${textConditions.join(" OR ")})`);
  for (const tag of q.tags) {
    filterConditions.push(`list_contains(Tags, '${tag.replaceAll("'", "''")}')`);
  }
  if (q.dateGte) filterConditions.push(`CreatedAt >= '${q.dateGte}'`);
  if (q.dateLte) filterConditions.push(`CreatedAt <= '${q.dateLte}'`);
  const where = filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : "";

  const scoreTerms = q.text.map((t) => {
    const escaped = t.replaceAll("'", "''");
    return `(CASE WHEN Title ILIKE '%${escaped}%' THEN 2 ELSE 0 END + CASE WHEN Description ILIKE '%${escaped}%' THEN 1 ELSE 0 END + len(list_filter(Keywords, k -> k = '${escaped}')))`;
  });
  const order =
    scoreTerms.length > 0
      ? `${scoreTerms.join(" + ")} DESC, CreatedAt DESC NULLS LAST`
      : `CreatedAt DESC NULLS LAST`;

  return `SELECT * FROM ${tableExpr} ${where} ORDER BY ${order}`;
}
