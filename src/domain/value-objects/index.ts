/**
 * Value Objects Barrel Exports
 * Provides clean import statements for all value objects
 * Following Domain-Driven Design principles
 */

// Email value object exports
export { Email, InvalidEmailError } from './email';

// Role value object exports
export { Role, SystemRole, Permission, InvalidRoleError } from './role';

// Password value object exports
export {
  Password,
  PasswordStrength,
  HashedPassword,
  InvalidPasswordError,
  PasswordHashError,
  DEFAULT_PASSWORD_REQUIREMENTS,
} from './password';
export type { PasswordRequirements } from './password';

// Money value object exports - classes and constants
export {
  Money,
  SUPPORTED_CURRENCIES,
  MoneyError,
  InvalidAmountError,
  InvalidCurrencyError,
  CurrencyMismatchError,
  DivisionByZeroError,
} from './money';

// Money value object exports - enums and types
export { RoundingMode } from './money';
export type { CurrencyCode, CurrencyInfo, MoneyOptions } from './money';

// Lot/Batch value object exports
export {
  LotBatch,
  LotStatus,
  LotBatchDomainError,
  LotBatchValidationError,
  InvalidLotNumberError,
  InvalidDateRangeError,
  InsufficientLotQuantityError,
  ExpiredLotError,
  LotStatusError,
} from './lot-batch';
export type { LotBatchProps, LotBatchPersistence } from './lot-batch';

// Report Period value object exports
export { ReportPeriod } from './report-period';
export type { ReportPeriodType, ReportPeriodProps } from './report-period';
