export const mockPrismaService = (): any => {
  const mock: any = {
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    seller: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mock)),
  };
  return mock;
};

export type MockPrismaService = ReturnType<typeof mockPrismaService>;
