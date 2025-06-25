import { DeleteCustomerCommand, validateDeleteCustomerCommand } from '../delete-customer.command';

describe('DeleteCustomerCommand', () => {
  const validCommand: DeleteCustomerCommand = {
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'Customer requested account closure',
    requestedBy: '550e8400-e29b-41d4-a716-446655440001',
  };

  it('should validate a complete valid command', () => {
    const result = validateDeleteCustomerCommand(validCommand);
    expect(result).toEqual(validCommand);
  });

  it('should require customerId', () => {
    const invalidCommand = { ...validCommand };
    delete (invalidCommand as any).customerId;

    expect(() => validateDeleteCustomerCommand(invalidCommand)).toThrow();
  });

  it('should require reason', () => {
    const invalidCommand = { ...validCommand };
    delete (invalidCommand as any).reason;

    expect(() => validateDeleteCustomerCommand(invalidCommand)).toThrow();
  });

  it('should require requestedBy', () => {
    const invalidCommand = { ...validCommand };
    delete (invalidCommand as any).requestedBy;

    expect(() => validateDeleteCustomerCommand(invalidCommand)).toThrow();
  });

  it('should reject empty reason', () => {
    const invalidCommand = { ...validCommand, reason: '' };

    expect(() => validateDeleteCustomerCommand(invalidCommand)).toThrow();
  });

  it('should reject reason that is too long', () => {
    const longReason = 'A'.repeat(1001);
    const invalidCommand = { ...validCommand, reason: longReason };

    expect(() => validateDeleteCustomerCommand(invalidCommand)).toThrow();
  });

  it('should accept valid UUID formats', () => {
    const validUuids = [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    ];

    validUuids.forEach((uuid) => {
      const command = { ...validCommand, customerId: uuid, requestedBy: uuid };
      expect(() => validateDeleteCustomerCommand(command)).not.toThrow();
    });
  });
});
