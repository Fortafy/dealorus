/**
 * Fuzzy search algorithm - finds matches even with typos and partial matches
 * Returns a score between 0 and 1 (1 being perfect match)
 */
export function fuzzyMatch(query, target) {
  if (!query || !target) return 0;

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Perfect match gets highest score
  if (t === q) return 1;
  if (t.includes(q)) return 0.9;

  let score = 0;
  let queryIndex = 0;
  let targetIndex = 0;
  let matchedChars = 0;

  while (queryIndex < q.length && targetIndex < t.length) {
    if (q[queryIndex] === t[targetIndex]) {
      matchedChars++;
      queryIndex++;
    }
    targetIndex++;
  }

  // Calculate score based on matched characters and string lengths
  if (matchedChars === 0) return 0;
  
  const baseScore = matchedChars / q.length;
  const lengthPenalty = 1 - (Math.abs(q.length - t.length) / t.length) * 0.5;
  return baseScore * lengthPenalty * 0.8;
}

/**
 * Search within an array of results
 */
export function searchResults(results, query, searchFields = ['organization_name']) {
  if (!query || query.trim() === '') return results;

  const q = query.trim().toLowerCase();
  
  return results
    .map(result => {
      let bestScore = 0;
      
      searchFields.forEach(field => {
        const value = result[field];
        if (value) {
          const score = fuzzyMatch(q, String(value));
          bestScore = Math.max(bestScore, score);
        }
      });

      return { ...result, _searchScore: bestScore };
    })
    .filter(result => result._searchScore > 0.3)
    .sort((a, b) => b._searchScore - a._searchScore);
}

/**
 * Filter results by multiple criteria
 */
export function filterResults(results, filters = {}) {
  return results.filter(result => {
    // State filter
    if (filters.state && result.state !== filters.state) return false;

    // Organization type filter
    if (filters.organization_type) {
      const resultType = String(result.organization_type || '').toLowerCase();
      const filterType = filters.organization_type.toLowerCase();
      if (!resultType.includes(filterType)) return false;
    }

    // NTEE code filter
    if (filters.ntee_code) {
      if (!result.ntee_code || !result.ntee_code.includes(filters.ntee_code)) return false;
    }

    // Revenue filters
    if (filters.min_revenue) {
      const minRev = parseInt(filters.min_revenue);
      const resultRev = parseInt(result.annual_revenue) || 0;
      if (resultRev < minRev) return false;
    }

    if (filters.max_revenue) {
      const maxRev = parseInt(filters.max_revenue);
      const resultRev = parseInt(result.annual_revenue) || 0;
      if (resultRev > maxRev) return false;
    }

    // City filter
    if (filters.city) {
      const resultCity = String(result.city || '').toLowerCase();
      const filterCity = filters.city.toLowerCase();
      if (!resultCity.includes(filterCity)) return false;
    }

    // Creation date filter
    if (filters.created_after) {
      const createdDate = new Date(result.created_date);
      const filterDate = new Date(filters.created_after);
      if (createdDate < filterDate) return false;
    }

    if (filters.created_before) {
      const createdDate = new Date(result.created_date);
      const filterDate = new Date(filters.created_before);
      if (createdDate > filterDate) return false;
    }

    return true;
  });
}

/**
 * Sort results by specified field and direction
 */
export function sortResults(results, sortBy = 'relevance', sortDir = 'desc') {
  const sorted = [...results];

  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => {
        const nameA = (a.organization_name || '').toLowerCase();
        const nameB = (b.organization_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      break;

    case 'revenue':
      sorted.sort((a, b) => {
        const revA = parseInt(a.annual_revenue) || 0;
        const revB = parseInt(b.annual_revenue) || 0;
        return revA - revB;
      });
      break;

    case 'created_date':
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_date || 0);
        const dateB = new Date(b.created_date || 0);
        return dateA - dateB;
      });
      break;

    case 'relevance':
    default:
      sorted.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
      break;
  }

  return sortDir === 'asc' ? sorted : sorted.reverse();
}

/**
 * Combined search, filter, and sort operation
 */
export function performSearch(results, query, filters = {}, sortBy = 'relevance', sortDir = 'desc') {
  let processed = results;

  // First apply text search
  if (query) {
    processed = searchResults(processed, query, ['organization_name', 'mission', 'address']);
  }

  // Then apply filters
  if (Object.keys(filters).some(key => filters[key])) {
    processed = filterResults(processed, filters);
  }

  // Finally sort
  processed = sortResults(processed, sortBy, sortDir);

  // Remove the internal search score
  return processed.map(({ _searchScore, ...rest }) => rest);
}