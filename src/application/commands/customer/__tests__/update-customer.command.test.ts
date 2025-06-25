import {
  UpdateCustomerCommand,
  validateUpdateCustomerCommand,
  createCustomerUpdateDomainObjects,
  validateCustomerUpdateBusinessRules,
} from '../update-customer.command';
import { CustomerType, PaymentTerms } from '../../../../domain/entities/customer';

describe('UpdateCustomerCommand', () => {
  const validCommand: UpdateCustomerCommand = {
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    firstName: 'John',
    lastName: 'Doe',
    customerType: CustomerType.RETAIL,
    email: 'john.doe@example.com',
    addresses: [
      {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
      },
    ],
    creditLimit: 5000,
    creditLimitCurrency: 'USD' as const,
    paymentTerms: PaymentTerms.NET_30,
    requestedBy: '550e8400-e29b-41d4-a716-446655440002',
  };

  it('should validate a complete valid command', () => {
    const result = validateUpdateCustomerCommand(validCommand);
    expect(result).toEqual(validCommand);
  });

  it('should validate partial update command', () => {
    const partialCommand: UpdateCustomerCommand = {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      firstName: 'Jane',
      requestedBy: '550e8400-e29b-41d4-a716-446655440002',
    };

    const result = validateUpdateCustomerCommand(partialCommand);
    expect(result).toEqual(partialCommand);
  });

  it('should require customerId', () => {
    const invalidCommand = { ...validCommand };
    delete (invalidCommand as any).customerId;

    expect(() => validateUpdateCustomerCommand(invalidCommand)).toThrow();
  });

  it('should require requestedBy', () => {
    const invalidCommand = { ...validCommand };
    delete (invalidCommand as any).requestedBy;

    expect(() => validateUpdateCustomerCommand(invalidCommand)).toThrow();
  });

  it('should create domain objects from valid command', () => {
    const result = createCustomerUpdateDomainObjects(validCommand);
    expect(result.email?.value).toBe('john.doe@example.com');
    expect(result.creditLimit?.decimalAmount).toBe(5000);
  });

  it('should validate business rules for basic updates', () => {
    const basicUpdateCommand = {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      firstName: 'Jane',
      requestedBy: '550e8400-e29b-41d4-a716-446655440002',
    };
    expect(() => validateCustomerUpdateBusinessRules(basicUpdateCommand)).not.toThrow();
  });

  it('should handle credit limit changes with reason', () => {
    const commandWithCreditChange = {
      ...validCommand,
      creditLimit: 10000,
      creditLimitChangeReason: 'Increased due to good payment history',
    };

    expect(() => validateCustomerUpdateBusinessRules(commandWithCreditChange)).not.toThrow();
  });
});
