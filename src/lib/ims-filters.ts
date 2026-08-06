export const normalizeFilterKey = (value: string | undefined | null) =>
  (value ?? "").trim().toLowerCase();

/** Strict exact match — "ANS DC" does NOT match "ANS DC W". */
export const matchesExactFilterValue = (
  value: string | undefined | null,
  allowed: string[]
) => {
  if (allowed.length === 0) return true;
  const normalized = normalizeFilterKey(value);
  const allowedSet = new Set(allowed.map(normalizeFilterKey));
  return allowedSet.has(normalized);
};

export const matchesCategoryItemFilters = (
  item: { category?: string; item_name?: string },
  categoryFilters: string[],
  itemNameFilters: string[]
) => {
  if (!matchesExactFilterValue(item.category, categoryFilters)) return false;
  if (!matchesExactFilterValue(item.item_name, itemNameFilters)) return false;
  return true;
};

export const matchesOptionSearch = (label: string, searchTerm: string) => {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  return (label ?? "").trim().toLowerCase() === term;
};