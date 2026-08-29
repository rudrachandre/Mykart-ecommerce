export class Meilisearch {
  constructor() {}

  index() {
    return {
      updateFilterableAttributes: jest.fn().mockResolvedValue({}),
      updateSortableAttributes: jest.fn().mockResolvedValue({}),
      updateSearchableAttributes: jest.fn().mockResolvedValue({}),
      updateDisplayedAttributes: jest.fn().mockResolvedValue({}),
      updateRankingRules: jest.fn().mockResolvedValue({}),
      updateTypoTolerance: jest.fn().mockResolvedValue({}),
      updatePagination: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
      }),
      addDocuments: jest.fn().mockResolvedValue({}),
      deleteDocument: jest.fn().mockResolvedValue({}),
    };
  }
}
