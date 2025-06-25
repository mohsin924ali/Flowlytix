import { GetCustomersQuery, validateGetCustomersQuery } from '../get-customers.query';
import { CustomerType, CustomerStatus, PaymentTerms } from '../../../../domain/entities/customer';

describe('GetCustomersQuery', () => {
  const validQuery: GetCustomersQuery = {
    requestedBy: '550e8400-e29b-41d4-a716-446655440000',
    agencyId: '550e8400-e29b-41d4-a716-446655440001',
    limit: 50,
    offset: 0,
    sortBy: 'customerCode',
    sortOrder: 'asc',
  };

  it('should validate a minimal valid query', () => {
    const result = validateGetCustomersQuery(validQuery);
    expect(result.requestedBy).toBe(validQuery.requestedBy);
    expect(result.agencyId).toBe(validQuery.agencyId);
  });

  it('should validate query with all optional filters', () => {
    const fullQuery: GetCustomersQuery = {
      ...validQuery,
      customerType: CustomerType.RETAIL,
      status: CustomerStatus.ACTIVE,
      search: 'John Doe',
      sortBy: 'fullName',
      sortOrder: 'desc',
      limit: 100,
      offset: 20,
    };

    const result = validateGetCustomersQuery(fullQuery);
    expect(result.customerType).toBe(CustomerType.RETAIL);
    expect(result.status).toBe(CustomerStatus.ACTIVE);
  });

  it('should require requestedBy', () => {
    const invalidQuery = { ...validQuery };
    delete (invalidQuery as any).requestedBy;

    expect(() => validateGetCustomersQuery(invalidQuery)).toThrow();
  });

  it('should accept optional agencyId', () => {
    const queryWithoutAgency = { ...validQuery };
    delete (queryWithoutAgency as any).agencyId;

    expect(() => validateGetCustomersQuery(queryWithoutAgency)).not.toThrow();
  });

  it('should reject invalid UUID formats', () => {
    const invalidQuery = { ...validQuery, requestedBy: 'invalid-uuid' };

    expect(() => validateGetCustomersQuery(invalidQuery)).toThrow();
  });

  it('should validate limit bounds', () => {
    const queryWithZeroLimit = { ...validQuery, limit: 0 };
    expect(() => validateGetCustomersQuery(queryWithZeroLimit)).toThrow();

    const queryWithHighLimit = { ...validQuery, limit: 1001 };
    expect(() => validateGetCustomersQuery(queryWithHighLimit)).toThrow();

    const queryWithValidLimit = { ...validQuery, limit: 100 };
    expect(() => validateGetCustomersQuery(queryWithValidLimit)).not.toThrow();
  });

  it('should validate offset bounds', () => {
    const queryWithNegativeOffset = { ...validQuery, offset: -1 };
    expect(() => validateGetCustomersQuery(queryWithNegativeOffset)).toThrow();

    const queryWithValidOffset = { ...validQuery, offset: 100 };
    expect(() => validateGetCustomersQuery(queryWithValidOffset)).not.toThrow();
  });

  it('should validate sort order values', () => {
    const validSortOrders = ['asc', 'desc'];

    validSortOrders.forEach((order) => {
      const query = { ...validQuery, sortOrder: order as 'asc' | 'desc' };
      expect(() => validateGetCustomersQuery(query)).not.toThrow();
    });

    const invalidQuery = { ...validQuery, sortOrder: 'invalid' as any };
    expect(() => validateGetCustomersQuery(invalidQuery)).toThrow();
  });

  it('should validate customer type enum', () => {
    const validTypes = Object.values(CustomerType);

    validTypes.forEach((type) => {
      const query = { ...validQuery, customerType: type };
      expect(() => validateGetCustomersQuery(query)).not.toThrow();
    });
  });

  it('should accept search strings', () => {
    const queryWithSearch = { ...validQuery, search: 'John Doe Company' };
    expect(() => validateGetCustomersQuery(queryWithSearch)).not.toThrow();

    const queryWithEmptySearch = { ...validQuery, search: '' };
    expect(() => validateGetCustomersQuery(queryWithEmptySearch)).not.toThrow();
  });
});
