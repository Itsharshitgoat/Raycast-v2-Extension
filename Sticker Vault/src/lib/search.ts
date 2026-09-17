/**
 * Normalizes a search term by lowercasing and trimming whitespace.
 * @param term The search term to normalize.
 * @returns The normalized search term.
 */
export function normalizeSearchTerm(term: string): string {
  return term.toLowerCase().trim();
}

/**
 * Builds a search keyword array for a sticker to power Raycast's fuzzy search.
 * @param sticker The sticker metadata.
 * @param tags An array of tag strings.
 * @param keywords An array of custom keyword strings (including emojis).
 * @returns An array of string keywords.
 */
export function buildSearchKeywords(
  sticker: {
    name: string;
    source: string;
    format: string;
    pack_name?: string | null;
    source_url?: string | null;
  },
  tags: string[],
  keywords: string[],
): string[] {
  const rawKeywords: string[] = [];

  // Split name into individual words
  if (sticker.name) {
    rawKeywords.push(...sticker.name.split(/\s+/));
  }

  // All tags
  if (tags) {
    rawKeywords.push(...tags);
  }

  // All custom keywords (includes emoji)
  if (keywords) {
    rawKeywords.push(...keywords);
  }

  // Pack name (if present), split into words
  if (sticker.pack_name) {
    rawKeywords.push(...sticker.pack_name.split(/\s+/));
  }

  // Source and format
  if (sticker.source) {
    rawKeywords.push(sticker.source);
  }
  if (sticker.format) {
    rawKeywords.push(sticker.format);
  }

  // Extract meaningful words from source_url
  if (sticker.source_url) {
    try {
      const url = new URL(sticker.source_url);
      const pathWords = url.pathname
        .split(/[^a-zA-Z0-9]+/) // split by non-alphanumeric (like hyphens, slashes)
        .filter((w) => w.length > 2); // ignore tiny words
      rawKeywords.push(...pathWords);
    } catch (e) {
      // Ignore invalid URLs
    }
  }

  // Normalize, deduplicate, and filter out empty strings
  const processed = rawKeywords.map((k) => k.trim().toLowerCase());

  const unique = Array.from(new Set(processed));
  return unique.filter((k) => k !== "");
}
