/**
 * Update Customer Command
 *
 * Command for updating existing customers in the goods distribution system.
 * Supports partial updates with comprehensive validation, business rules enforcement,
 * and security constraints following CQRS pattern.
 *
 * Business Rules:
 * - Customer must exist and be accessible by the requesting user
 * - Customer code cannot be changed once set
 * - Email must be valid and unique within agency (if provided)
 * - Credit limit changes require proper authorization
 * - Status changes follow business workflow rules
 * - Address and contact updates maintain data integrity
 *
 * @domain Customer Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

import { z } from 'zod';
import { Email } from '../../../domain/value-objects/email';
import { Money, CurrencyCode } from '../../../domain/value-objects/money';
import {
  CustomerType,
  CustomerStatus,
  PaymentTerms,
  CustomerAddress,
  CustomerContact,
} from '../../../domain/entities/customer';

/**
 * Zod schema for customer address validation (for updates)
 */
const CustomerAddressUpdateSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200, 'Street address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().min(1, 'State is required').max(100, 'State name too long'),
  zipCode: z.string().min(1, 'ZIP code is required').max(20, 'ZIP code too long'),
  country: z.string().min(1, 'Country is required').max(100, 'Country name too long'),
  isDefault: z.boolean().optional(),
  addressType: z.enum(['BILLING', 'SHIPPING', 'BOTH']).optional(),
});

/**
 * Zod schema for customer contact validation (for updates)
 */
const CustomerContactUpdateSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(100, 'Contact name too long'),
  title: z.string().max(100, 'Contact title too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  mobile: z.string().max(20, 'Mobile number too long').optional(),
  isPrimary: z.boolean().optional(),
});

/**
 * Zod schema for update customer command validation
 */
export const UpdateCustomerCommandSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID format'),

  // Basic Information Updates (optional)
  companyName: z.string().max(200, 'Company name too long').optional(),

  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters')
    .optional(),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters')
    .optional(),

  customerType: z
    .nativeEnum(CustomerType, {
      errorMap: () => ({ message: 'Invalid customer type' }),
    })
    .optional(),

  email: z.string().email('Invalid email format').max(255, 'Email too long').optional(),

  phone: z
    .string()
    .max(20, 'Phone number too long')
    .regex(/^[\d\s()+.-]+$/, 'Phone number contains invalid characters')
    .optional(),

  mobile: z
    .string()
    .max(20, 'Mobile number too long')
    .regex(/^[\d\s()+.-]+$/, 'Mobile number contains invalid characters')
    .optional(),

  // Address Updates (optional - replaces all addresses if provided)
  addresses: z
    .array(CustomerAddressUpdateSchema)
    .min(1, 'At least one address is required')
    .max(10, 'Too many addresses (maximum 10)')
    .optional(),

  // Contact Updates (optional - replaces all contacts if provided)
  contacts: z.array(CustomerContactUpdateSchema).max(20, 'Too many contacts (maximum 20)').optional(),

  // Financial Updates (optional)
  creditLimit: z
    .number()
    .min(0, 'Credit limit cannot be negative')
    .max(10000000, 'Credit limit too high')
    .finite('Credit limit must be a valid number')
    .optional(),

  creditLimitCurrency: z
    .string()
    .refine((value) => Money.isSupportedCurrency(value), {
      message: 'Invalid currency code',
    })
    .optional() as z.ZodOptional<z.ZodSchema<CurrencyCode>>,

  paymentTerms: z
    .nativeEnum(PaymentTerms, {
      errorMap: () => ({ message: 'Invalid payment terms' }),
    })
    .optional(),

  // Business Information Updates (optional)
  taxNumber: z.string().max(50, 'Tax number too long').optional(),

  website: z.string().url('Invalid website URL').max(255, 'Website URL too long').optional(),

  notes: z.string().max(2000, 'Notes too long').optional(),

  // Status Update (optional)
  status: z
    .nativeEnum(CustomerStatus, {
      errorMap: () => ({ message: 'Invalid customer status' }),
    })
    .optional(),

  // Credit Limit Change Reason (required if creditLimit is provided)
  creditLimitChangeReason: z.string().max(500, 'Credit limit change reason too long').optional(),

  // Metadata
  requestedBy: z.string().uuid('Invalid user ID format'),
});

/**
 * Update Customer Command Type
 */
export type UpdateCustomerCommand = z.infer<typeof UpdateCustomerCommandSchema>;

/**
 * Update Customer Command Result
 */
export interface UpdateCustomerCommandResult {
  readonly success: boolean;
  readonly customerId?: string;
  readonly customerCode?: string;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class UpdateCustomerCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'UpdateCustomerCommandValidationError';
  }
}

/**
 * Validate update customer command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {UpdateCustomerCommandValidationError} When validation fails
 */
export function validateUpdateCustomerCommand(command: unknown): UpdateCustomerCommand {
  try {
    return UpdateCustomerCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      throw new UpdateCustomerCommandValidationError('Customer update validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Create domain value objects from update command
 * @param command - Validated command
 * @returns Domain value objects
 */
export function createCustomerUpdateDomainObjects(command: UpdateCustomerCommand) {
  const result: {
    email?: Email;
    creditLimit?: Money;
    addresses?: CustomerAddress[];
    contacts?: CustomerContact[];
  } = {};

  // Create Email value object if provided
  if (command.email !== undefined) {
    result.email = new Email(command.email);
  }

  // Create Money value object for credit limit if provided
  if (command.creditLimit !== undefined && command.creditLimitCurrency !== undefined) {
    result.creditLimit = Money.fromDecimal(command.creditLimit, command.creditLimitCurrency);
  }

  // Process addresses if provided
  if (command.addresses !== undefined) {
    result.addresses = command.addresses.map((addr) => {
      const address: CustomerAddress = {
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        country: addr.country,
      };
      if (addr.isDefault !== undefined) {
        (address as any).isDefault = addr.isDefault;
      }
      if (addr.addressType !== undefined) {
        (address as any).addressType = addr.addressType;
      }
      return address;
    });
  }

  // Process contacts if provided
  if (command.contacts !== undefined) {
    result.contacts = command.contacts.map((contact) => {
      const contactObj: CustomerContact = {
        name: contact.name,
      };
      if (contact.title !== undefined) {
        (contactObj as any).title = contact.title;
      }
      if (contact.email !== undefined) {
        (contactObj as any).email = new Email(contact.email);
      }
      if (contact.phone !== undefined) {
        (contactObj as any).phone = contact.phone;
      }
      if (contact.mobile !== undefined) {
        (contactObj as any).mobile = contact.mobile;
      }
      if (contact.isPrimary !== undefined) {
        (contactObj as any).isPrimary = contact.isPrimary;
      }
      return contactObj;
    });
  }

  return result;
}

/**
 * Business rule validations for customer updates
 * @param command - Validated command
 * @throws {UpdateCustomerCommandValidationError} When business rules are violated
 */
export function validateCustomerUpdateBusinessRules(command: UpdateCustomerCommand): void {
  const errors: Record<string, string[]> = {};

  // Validate credit limit change reason is provided when changing credit limit
  if (command.creditLimit !== undefined && !command.creditLimitChangeReason?.trim()) {
    errors.creditLimitChangeReason = ['Credit limit change reason is required when updating credit limit'];
  }

  // Validate currency is provided when credit limit is provided
  if (command.creditLimit !== undefined && command.creditLimitCurrency === undefined) {
    errors.creditLimitCurrency = ['Currency is required when updating credit limit'];
  }

  // Validate addresses have at most one default if provided
  if (command.addresses !== undefined) {
    const defaultAddresses = command.addresses.filter((addr) => addr.isDefault);
    if (defaultAddresses.length === 0) {
      // Auto-set first address as default
      (command.addresses[0] as any).isDefault = true;
    } else if (defaultAddresses.length > 1) {
      errors.addresses = ['Only one address can be marked as default'];
    }
  }

  // Validate contacts have at most one primary if provided
  if (command.contacts !== undefined) {
    const primaryContacts = command.contacts.filter((contact) => contact.isPrimary);
    if (primaryContacts.length > 1) {
      errors.contacts = ['Only one contact can be marked as primary'];
    }
  }

  // Validate payment terms are reasonable for customer type if both are provided
  if (command.customerType !== undefined && command.paymentTerms !== undefined) {
    const restrictedTerms = [PaymentTerms.NET_45, PaymentTerms.NET_60, PaymentTerms.LETTER_OF_CREDIT];
    if (command.customerType === CustomerType.RETAIL && restrictedTerms.includes(command.paymentTerms)) {
      errors.paymentTerms = ['Extended payment terms not allowed for retail customers'];
    }
  }

  // Validate credit limit is reasonable for customer type if both are provided
  if (command.customerType !== undefined && command.creditLimit !== undefined) {
    if (command.customerType === CustomerType.RETAIL && command.creditLimit > 50000) {
      errors.creditLimit = ['Credit limit too high for retail customer type'];
    }
  }

  // Validate company name for business customer types if customer type is being updated
  if (command.customerType !== undefined) {
    const businessTypes = [CustomerType.WHOLESALE, CustomerType.DISTRIBUTOR, CustomerType.CORPORATE];
    if (businessTypes.includes(command.customerType) && command.companyName === '') {
      errors.companyName = ['Company name cannot be empty for business customers'];
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new UpdateCustomerCommandValidationError('Customer update business rules validation failed', errors);
  }
}
