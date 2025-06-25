/**
 * Create Customer Command
 *
 * Command for creating new customers in the goods distribution system.
 * Handles comprehensive customer data validation, business rules enforcement,
 * and security constraints following CQRS pattern.
 *
 * Business Rules:
 * - Customer code must be unique within agency
 * - Email must be valid and unique within agency (optional)
 * - Credit limit cannot be negative
 * - At least one address is required
 * - Contact information must be valid
 * - Payment terms must be reasonable
 * - All required fields must be provided
 *
 * @domain Customer Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

import { z } from 'zod';
import { Email } from '../../../domain/value-objects/email';
import { Money, CurrencyCode } from '../../../domain/value-objects/money';
import { CustomerType, PaymentTerms, CustomerAddress, CustomerContact } from '../../../domain/entities/customer';

/**
 * Zod schema for customer address validation
 */
const CustomerAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200, 'Street address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().min(1, 'State is required').max(100, 'State name too long'),
  zipCode: z.string().min(1, 'ZIP code is required').max(20, 'ZIP code too long'),
  country: z.string().min(1, 'Country is required').max(100, 'Country name too long'),
  isDefault: z.boolean().optional(),
  addressType: z.enum(['BILLING', 'SHIPPING', 'BOTH']).optional(),
});

/**
 * Zod schema for customer contact validation
 */
const CustomerContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(100, 'Contact name too long'),
  title: z.string().max(100, 'Contact title too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  mobile: z.string().max(20, 'Mobile number too long').optional(),
  isPrimary: z.boolean().optional(),
});

/**
 * Zod schema for create customer command validation
 */
export const CreateCustomerCommandSchema = z.object({
  customerCode: z
    .string()
    .min(1, 'Customer code is required')
    .max(50, 'Customer code too long')
    .regex(
      /^[A-Z0-9][A-Z0-9_-]*[A-Z0-9]$|^[A-Z0-9]$/,
      'Customer code must contain only uppercase letters, numbers, hyphens, and underscores'
    ),

  companyName: z.string().max(200, 'Company name too long').optional(),

  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'First name contains invalid characters'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'Last name contains invalid characters'),

  customerType: z.nativeEnum(CustomerType, {
    errorMap: () => ({ message: 'Invalid customer type' }),
  }),

  email: z.string().email('Invalid email format').max(255, 'Email too long'),

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

  addresses: z
    .array(CustomerAddressSchema)
    .min(1, 'At least one address is required')
    .max(10, 'Too many addresses (maximum 10)'),

  contacts: z.array(CustomerContactSchema).max(20, 'Too many contacts (maximum 20)').optional(),

  creditLimit: z
    .number()
    .min(0, 'Credit limit cannot be negative')
    .max(10000000, 'Credit limit too high')
    .finite('Credit limit must be a valid number'),

  creditLimitCurrency: z.string().refine((value) => Money.isSupportedCurrency(value), {
    message: 'Invalid currency code',
  }),

  paymentTerms: z.nativeEnum(PaymentTerms, {
    errorMap: () => ({ message: 'Invalid payment terms' }),
  }),

  taxNumber: z.string().max(50, 'Tax number too long').optional(),

  website: z.string().url('Invalid website URL').max(255, 'Website URL too long').optional(),

  notes: z.string().max(2000, 'Notes too long').optional(),

  agencyId: z.string().uuid('Invalid agency ID format'),

  requestedBy: z.string().uuid('Invalid user ID format'),
});

/**
 * Create Customer Command Type
 */
export type CreateCustomerCommand = z.infer<typeof CreateCustomerCommandSchema>;

/**
 * Create Customer Command Result
 */
export interface CreateCustomerCommandResult {
  readonly success: boolean;
  readonly customerId?: string;
  readonly customerCode?: string;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class CreateCustomerCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'CreateCustomerCommandValidationError';
  }
}

/**
 * Validate create customer command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {CreateCustomerCommandValidationError} When validation fails
 */
export function validateCreateCustomerCommand(command: unknown): CreateCustomerCommand {
  try {
    return CreateCustomerCommandSchema.parse(command);
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

      throw new CreateCustomerCommandValidationError('Customer creation validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Create domain value objects from command
 * @param command - Validated command
 * @returns Domain value objects
 */
export function createCustomerDomainObjects(command: CreateCustomerCommand) {
  // Create Email value object
  const email = new Email(command.email);

  // Create Money value object for credit limit
  const creditLimit = Money.fromDecimal(command.creditLimit, command.creditLimitCurrency);

  // Process addresses
  const addresses: CustomerAddress[] = command.addresses.map((addr) => {
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

  // Process contacts if provided
  const contacts: CustomerContact[] =
    command.contacts?.map((contact) => {
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
    }) || [];

  return {
    email,
    creditLimit,
    addresses,
    contacts,
  };
}

/**
 * Business rule validations for customer creation
 * @param command - Validated command
 * @throws {CreateCustomerCommandValidationError} When business rules are violated
 */
export function validateCustomerBusinessRules(command: CreateCustomerCommand): void {
  const errors: Record<string, string[]> = {};

  // Validate addresses have at least one default
  const defaultAddresses = command.addresses.filter((addr) => addr.isDefault);
  if (defaultAddresses.length === 0) {
    // Auto-set first address as default - this is acceptable business logic
    (command.addresses[0] as any).isDefault = true;
  } else if (defaultAddresses.length > 1) {
    errors.addresses = ['Only one address can be marked as default'];
  }

  // Validate contacts have at most one primary
  if (command.contacts) {
    const primaryContacts = command.contacts.filter((contact) => contact.isPrimary);
    if (primaryContacts.length > 1) {
      errors.contacts = ['Only one contact can be marked as primary'];
    }
  }

  // Validate payment terms are reasonable for customer type
  const restrictedTerms = [PaymentTerms.NET_45, PaymentTerms.NET_60, PaymentTerms.LETTER_OF_CREDIT];
  if (command.customerType === CustomerType.RETAIL && restrictedTerms.includes(command.paymentTerms)) {
    errors.paymentTerms = ['Extended payment terms not allowed for retail customers'];
  }

  // Validate credit limit is reasonable for customer type
  if (command.customerType === CustomerType.RETAIL && command.creditLimit > 50000) {
    errors.creditLimit = ['Credit limit too high for retail customer type'];
  }

  // Validate company name for business customer types
  const businessTypes = [CustomerType.WHOLESALE, CustomerType.DISTRIBUTOR, CustomerType.CORPORATE];
  if (businessTypes.includes(command.customerType) && !command.companyName?.trim()) {
    errors.companyName = ['Company name is required for business customers'];
  }

  if (Object.keys(errors).length > 0) {
    throw new CreateCustomerCommandValidationError('Customer business rules validation failed', errors);
  }
}
