export class Meilisearch {
  constructor() {}

  index() {
    return {
      updateFilterableAttributes: jest.fn().mockResolvedValue({}),
      updateSortableAttributes: jest.fn().mockResolvedValue({}),
      updateSearchableAttributes: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
      }),
      addDocuments: jest.fn().mockResolvedValue({}),
      deleteDocument: jest.fn().mockResolvedValue({}),
    };
  }
}
