/**
 * Create Agency Command
 *
 * Command for creating new agencies in the multi-tenant distribution system.
 * Handles comprehensive agency data validation, business rules enforcement,
 * and security constraints following CQRS pattern.
 *
 * Business Rules:
 * - Agency name must be unique system-wide
 * - Database path must be unique and valid
 * - Only users with CREATE_AGENCY permission can create agencies
 * - Settings must be valid business configuration
 * - Contact information must be valid
 * - All required fields must be provided
 *
 * @domain Agency Management
 * @pattern CQRS Command
 * @architecture Multi-tenant
 * @version 1.0.0
 */

import { z } from 'zod';
import { Email } from '../../../domain/value-objects/email';
import { AgencyStatus, AgencySettings } from '../../../domain/entities/agency';

/**
 * Zod schema for agency business hours validation
 */
const AgencyBusinessHoursSchema = z.object({
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  timezone: z.string().min(1, 'Timezone is required'),
});

/**
 * Zod schema for agency notifications validation
 */
const AgencyNotificationsSchema = z.object({
  lowStock: z.boolean(),
  overduePayments: z.boolean(),
  newOrders: z.boolean(),
});

/**
 * Zod schema for agency business settings validation
 */
const AgencyBusinessSettingsSchema = z.object({
  allowCreditSales: z.boolean(),
  defaultCreditDays: z
    .number()
    .int('Credit days must be an integer')
    .min(0, 'Credit days cannot be negative')
    .max(365, 'Credit days cannot exceed 365'),
  maxCreditLimit: z
    .number()
    .min(0, 'Max credit limit cannot be negative')
    .max(10000000, 'Max credit limit too high')
    .finite('Max credit limit must be a valid number'),
  requireApprovalForOrders: z.boolean(),
  enableInventoryTracking: z.boolean(),
  taxRate: z
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(1, 'Tax rate cannot exceed 100%')
    .finite('Tax rate must be a valid number'),
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters only'),
  businessHours: AgencyBusinessHoursSchema,
  notifications: AgencyNotificationsSchema,
});

/**
 * Zod schema for create agency command validation
 */
export const CreateAgencyCommandSchema = z.object({
  name: z
    .string()
    .min(2, 'Agency name must be at least 2 characters')
    .max(100, 'Agency name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s&'().,!?-]+$/, 'Agency name contains invalid characters')
    .refine((name) => name.trim().length > 0, 'Agency name cannot be only whitespace'),

  databasePath: z
    .string()
    .min(1, 'Database path is required')
    .max(255, 'Database path too long')
    .regex(/^[a-zA-Z0-9_-]+\.db$/, 'Database path must end with .db and contain only valid characters')
    .refine(
      (path) => !path.includes('..') && !path.includes('/') && !path.includes('\\'),
      'Database path cannot contain path traversal or directory separators'
    ),

  contactPerson: z
    .string()
    .max(100, 'Contact person name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]*$/, 'Contact person name contains invalid characters')
    .optional(),

  phone: z
    .string()
    .max(20, 'Phone number too long')
    .regex(/^[\d\s()+.-]*$/, 'Phone number contains invalid characters')
    .optional(),

  email: z.string().email('Invalid email format').max(255, 'Email too long').optional(),

  address: z.string().max(500, 'Address too long').optional(),

  settings: AgencyBusinessSettingsSchema,

  status: z
    .nativeEnum(AgencyStatus, {
      errorMap: () => ({ message: 'Invalid agency status' }),
    })
    .optional(),

  createdBy: z.string().uuid('Invalid user ID format'),
});

/**
 * Create Agency Command Type
 */
export type CreateAgencyCommand = z.infer<typeof CreateAgencyCommandSchema>;

/**
 * Create Agency Command Result
 */
export interface CreateAgencyCommandResult {
  readonly success: boolean;
  readonly agencyId?: string;
  readonly agencyName?: string;
  readonly databasePath?: string;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class CreateAgencyCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'CreateAgencyCommandValidationError';
  }
}

/**
 * Validate create agency command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {CreateAgencyCommandValidationError} When validation fails
 */
export function validateCreateAgencyCommand(command: unknown): CreateAgencyCommand {
  try {
    return CreateAgencyCommandSchema.parse(command);
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

      throw new CreateAgencyCommandValidationError('Agency creation validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Create domain value objects from command
 * @param command - Validated command
 * @returns Domain value objects
 */
export function createAgencyDomainObjects(command: CreateAgencyCommand) {
  // Create Email value object if email provided
  const email = command.email ? new Email(command.email) : undefined;

  // Validate business settings
  const settings: AgencySettings = {
    allowCreditSales: command.settings.allowCreditSales,
    defaultCreditDays: command.settings.defaultCreditDays,
    maxCreditLimit: command.settings.maxCreditLimit,
    requireApprovalForOrders: command.settings.requireApprovalForOrders,
    enableInventoryTracking: command.settings.enableInventoryTracking,
    taxRate: command.settings.taxRate,
    currency: command.settings.currency,
    businessHours: command.settings.businessHours,
    notifications: command.settings.notifications,
  };

  return {
    email,
    settings,
  };
}

/**
 * Validate agency business rules
 * @param command - Create agency command
 * @throws {Error} When business rules are violated
 */
export function validateAgencyBusinessRules(command: CreateAgencyCommand): void {
  // Validate business settings coherence
  if (command.settings.allowCreditSales && command.settings.maxCreditLimit <= 0) {
    throw new Error('If credit sales are allowed, max credit limit must be greater than 0');
  }

  if (command.settings.defaultCreditDays > 1 && !command.settings.allowCreditSales) {
    throw new Error('Credit days can only be set when credit sales are allowed');
  }

  // Validate currency-specific rules
  if (!['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'].includes(command.settings.currency)) {
    console.warn(`Currency ${command.settings.currency} may not be fully supported`);
  }

  // Validate tax rate ranges for common regions
  if (command.settings.taxRate > 0.3) {
    console.warn('Tax rate above 30% is unusually high - please verify');
  }

  // Validate credit terms coherence
  if (command.settings.defaultCreditDays > 180) {
    console.warn('Credit terms over 180 days may pose collection risks');
  }

  // Validate business hours coherence
  const startTime = parseTimeString(command.settings.businessHours.start);
  const endTime = parseTimeString(command.settings.businessHours.end);

  if (startTime >= endTime) {
    throw new Error('Business start time must be before end time');
  }

  // Validate timezone (basic check)
  const validTimezones = ['UTC', 'EST', 'PST', 'CST', 'MST', 'GMT', 'CET', 'JST', 'AEST'];
  if (!validTimezones.includes(command.settings.businessHours.timezone)) {
    console.warn(`Timezone ${command.settings.businessHours.timezone} may not be recognized`);
  }
}

/**
 * Helper function to parse time string into minutes since midnight
 * @param timeString - Time in HH:MM format
 * @returns Minutes since midnight
 */
function parseTimeString(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid time format: ${timeString}`);
  }
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  return hours * 60 + minutes;
}
