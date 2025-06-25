/**
 * Update Agency Command
 *
 * Command for updating existing agencies in the multi-tenant distribution system.
 * Handles comprehensive agency data validation, business rules enforcement,
 * and security constraints following CQRS pattern.
 *
 * Business Rules:
 * - Only users with MANAGE_SETTINGS permission can update agencies
 * - Agency name must remain unique system-wide if changed
 * - Database path cannot be changed after creation
 * - Settings must be valid business configuration
 * - Contact information must be valid
 * - Agency must exist and be accessible
 * - Status changes have specific business rules
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
    .min(1, 'Credit days must be at least 1')
    .max(365, 'Credit days cannot exceed 365'),
  maxCreditLimit: z.number().min(0, 'Credit limit cannot be negative').max(1000000, 'Credit limit too high'),
  requireApprovalForOrders: z.boolean(),
  enableInventoryTracking: z.boolean(),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(1, 'Tax rate cannot exceed 100%'),
  currency: z
    .string()
    .length(3, 'Currency must be 3-letter ISO code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO code'),
  businessHours: AgencyBusinessHoursSchema,
  notifications: AgencyNotificationsSchema,
});

/**
 * Zod schema for update agency command validation
 */
export const UpdateAgencyCommandSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),

  name: z
    .string()
    .min(2, 'Agency name must be at least 2 characters')
    .max(100, 'Agency name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s&'().,!?-]+$/, 'Agency name contains invalid characters')
    .refine((name) => name.trim().length > 0, 'Agency name cannot be only whitespace')
    .optional(),

  contactPerson: z
    .string()
    .max(100, 'Contact person name too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]*$/, 'Contact person name contains invalid characters')
    .nullable()
    .optional(),

  phone: z
    .string()
    .max(20, 'Phone number too long')
    .regex(/^[\d\s()+.-]*$/, 'Phone number contains invalid characters')
    .nullable()
    .optional(),

  email: z.string().email('Invalid email format').max(255, 'Email too long').nullable().optional(),

  address: z.string().max(500, 'Address too long').nullable().optional(),

  settings: AgencyBusinessSettingsSchema.optional(),

  status: z
    .nativeEnum(AgencyStatus, {
      errorMap: () => ({ message: 'Invalid agency status' }),
    })
    .optional(),

  updatedBy: z.string().uuid('Invalid user ID format'),

  reason: z.string().min(1, 'Update reason is required').max(500, 'Update reason too long').optional(),
});

/**
 * Update Agency Command Type
 */
export type UpdateAgencyCommand = z.infer<typeof UpdateAgencyCommandSchema>;

/**
 * Update Agency Command Result
 */
export interface UpdateAgencyCommandResult {
  readonly success: boolean;
  readonly agencyId?: string;
  readonly agencyName?: string;
  readonly isOperational?: boolean;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class UpdateAgencyCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'UpdateAgencyCommandValidationError';
  }
}

/**
 * Validate update agency command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {UpdateAgencyCommandValidationError} When validation fails
 */
export function validateUpdateAgencyCommand(command: unknown): UpdateAgencyCommand {
  try {
    return UpdateAgencyCommandSchema.parse(command);
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

      throw new UpdateAgencyCommandValidationError('Agency update validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Create domain value objects from update command
 * @param command - Validated command
 * @returns Domain value objects
 */
export function createUpdateAgencyDomainObjects(command: UpdateAgencyCommand) {
  // Create Email value object if email provided
  const email = command.email !== undefined ? (command.email ? new Email(command.email) : null) : undefined;

  // Validate business settings if provided
  const settings: AgencySettings | undefined = command.settings
    ? {
        allowCreditSales: command.settings.allowCreditSales,
        defaultCreditDays: command.settings.defaultCreditDays,
        maxCreditLimit: command.settings.maxCreditLimit,
        requireApprovalForOrders: command.settings.requireApprovalForOrders,
        enableInventoryTracking: command.settings.enableInventoryTracking,
        taxRate: command.settings.taxRate,
        currency: command.settings.currency,
        businessHours: command.settings.businessHours,
        notifications: command.settings.notifications,
      }
    : undefined;

  return {
    email,
    settings,
  };
}

/**
 * Validate agency update business rules
 * @param command - Validated command
 * @throws {Error} When business rules are violated
 */
export function validateUpdateAgencyBusinessRules(command: UpdateAgencyCommand): void {
  // Validate business hours if settings provided
  if (command.settings?.businessHours) {
    const { start, end } = command.settings.businessHours;
    const startTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);

    if (startTime >= endTime) {
      throw new Error('Business start time must be before end time');
    }
  }

  // Validate credit days and credit sales consistency if settings provided
  if (command.settings) {
    if (command.settings.defaultCreditDays > 1 && !command.settings.allowCreditSales) {
      throw new Error('Credit days should be 1 when credit sales are disabled');
    }
  }

  // Validate that at least one field is being updated
  const updateFields = ['name', 'contactPerson', 'phone', 'email', 'address', 'settings', 'status'];
  const hasUpdate = updateFields.some((field) => command[field as keyof UpdateAgencyCommand] !== undefined);

  if (!hasUpdate) {
    throw new Error('At least one field must be provided for update');
  }
}
