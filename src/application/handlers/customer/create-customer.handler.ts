/**
 * Create Customer Handler
 *
 * Handler for CreateCustomer command following CQRS pattern.
 * Implements business logic for customer creation with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with CREATE_CUSTOMER permission can create customers
 * - Customer code must be unique within agency
 * - Email must be unique within agency (if provided)
 * - Credit limit validation based on user role
 * - Address and contact validation
 * - Payment terms validation based on customer type
 *
 * @domain Customer Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  CreateCustomerCommand,
  validateCreateCustomerCommand,
  createCustomerDomainObjects,
} from '../../commands/customer/create-customer.command';
import { Customer, CustomerType, PaymentTerms } from '../../../domain/entities/customer';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';
import { Money } from '../../../domain/value-objects/money';

/**
 * Handler for CreateCustomer command
 * Implements business logic for customer creation with proper authorization
 */
export class CreateCustomerHandler {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles customer creation command
   * @param command - CreateCustomer command
   * @returns Promise<string> - ID of created customer
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(command: CreateCustomerCommand): Promise<string> {
    // Validate command
    validateCreateCustomerCommand(command);

    // Get the user who is creating this customer (for authorization)
    const creatingUser = await this.userRepository.findById(command.requestedBy);
    if (!creatingUser) {
      throw new Error('Creating user not found');
    }

    // Check authorization - only users with CREATE_CUSTOMER permission can create customers
    if (!creatingUser.hasPermission(Permission.CREATE_CUSTOMER)) {
      throw new Error('Insufficient permissions to create customer');
    }

    // Check if customer with same code already exists in the agency
    const existingCustomerByCode = await this.customerRepository.findByCustomerCode(
      command.customerCode,
      command.agencyId
    );
    if (existingCustomerByCode) {
      throw new Error('Customer with this code already exists in the agency');
    }

    // Check if customer with same email already exists in the agency (if email provided)
    const { email } = createCustomerDomainObjects(command);
    const existingCustomerByEmail = await this.customerRepository.findByEmail(email, command.agencyId);
    if (existingCustomerByEmail) {
      throw new Error('Customer with this email already exists in the agency');
    }

    // Validate business rules
    this.validateBusinessRules(command, creatingUser);

    // Create domain value objects
    const { creditLimit } = createCustomerDomainObjects(command);

    // Create the customer entity
    const customerProps: any = {
      customerCode: command.customerCode,
      firstName: command.firstName,
      lastName: command.lastName,
      customerType: command.customerType,
      email,
      creditLimit,
      paymentTerms: command.paymentTerms,
      addresses: command.addresses,
      agencyId: command.agencyId,
      createdBy: command.requestedBy,
    };

    // Add optional properties only if they exist
    if (command.companyName !== undefined) {
      customerProps.companyName = command.companyName;
    }
    if (command.phone !== undefined) {
      customerProps.phone = command.phone;
    }
    if (command.mobile !== undefined) {
      customerProps.mobile = command.mobile;
    }
    if (command.contacts !== undefined) {
      customerProps.contacts = command.contacts;
    }
    if (command.taxNumber !== undefined) {
      customerProps.taxNumber = command.taxNumber;
    }
    if (command.website !== undefined) {
      customerProps.website = command.website;
    }
    if (command.notes !== undefined) {
      customerProps.notes = command.notes;
    }

    const newCustomer = Customer.create(customerProps);

    // Auto-approve customer if created by authorized user (business rule)
    const approvedCustomer = newCustomer.approve(command.requestedBy);

    // Save to repository
    await this.customerRepository.save(approvedCustomer);

    return newCustomer.id;
  }

  /**
   * Validates business rules for customer creation
   * @param command - Create customer command
   * @param creatingUser - User creating the customer
   * @throws {Error} When business rules are violated
   */
  private validateBusinessRules(command: CreateCustomerCommand, creatingUser: any): void {
    // Credit limit validation based on user role
    const creditLimit = Money.fromDecimal(command.creditLimit, command.creditLimitCurrency);
    const maxCreditLimit = this.getMaxCreditLimitForUser(creatingUser);

    if (creditLimit.compareTo(maxCreditLimit) > 0) {
      throw new Error(
        `Credit limit ${creditLimit.toString()} exceeds maximum allowed ${maxCreditLimit.toString()} for your role`
      );
    }

    // Payment terms validation based on customer type
    this.validatePaymentTermsForCustomerType(command.customerType, command.paymentTerms);

    // Corporate customers must have company name
    if (command.customerType === CustomerType.CORPORATE && !command.companyName) {
      throw new Error('Corporate customers must have a company name');
    }

    // Government customers must have tax number
    if (command.customerType === CustomerType.GOVERNMENT && !command.taxNumber) {
      throw new Error('Government customers must have a tax number');
    }

    // Wholesale and distributor customers should have higher credit limits (warning)
    if (
      (command.customerType === CustomerType.WHOLESALE || command.customerType === CustomerType.DISTRIBUTOR) &&
      command.creditLimit < 10000
    ) {
      console.warn(
        `Customer ${command.customerCode}: ${command.customerType} customers typically have credit limits above $10,000`
      );
    }

    // Validate address requirements
    this.validateAddressRequirements(command);
  }

  /**
   * Gets maximum credit limit allowed for user role
   * @param user - Creating user
   * @returns Maximum credit limit
   */
  private getMaxCreditLimitForUser(user: any): Money {
    // Business rule: Credit limit authorization based on user role
    switch (user.role.name) {
      case 'ADMIN':
      case 'MANAGER':
        return Money.fromDecimal(1000000, 'USD'); // $1M for admin/manager
      case 'SALES_REP':
        return Money.fromDecimal(100000, 'USD'); // $100K for sales rep
      case 'CLERK':
        return Money.fromDecimal(10000, 'USD'); // $10K for clerk
      default:
        return Money.fromDecimal(5000, 'USD'); // $5K default
    }
  }

  /**
   * Validates payment terms for customer type
   * @param customerType - Customer type
   * @param paymentTerms - Payment terms
   * @throws {Error} When payment terms are invalid for customer type
   */
  private validatePaymentTermsForCustomerType(customerType: CustomerType, paymentTerms: PaymentTerms): void {
    // Business rules for payment terms by customer type
    switch (customerType) {
      case CustomerType.RETAIL:
        if (![PaymentTerms.CASH_ON_DELIVERY, PaymentTerms.ADVANCE_PAYMENT].includes(paymentTerms)) {
          throw new Error('Retail customers can only have CASH_ON_DELIVERY or ADVANCE_PAYMENT terms');
        }
        break;

      case CustomerType.GOVERNMENT:
        if (paymentTerms === PaymentTerms.CASH_ON_DELIVERY) {
          throw new Error('Government customers cannot have CASH_ON_DELIVERY payment terms');
        }
        break;

      case CustomerType.ONLINE:
        if (![PaymentTerms.ADVANCE_PAYMENT, PaymentTerms.CASH_ON_DELIVERY].includes(paymentTerms)) {
          throw new Error('Online customers can only have ADVANCE_PAYMENT or CASH_ON_DELIVERY terms');
        }
        break;

      // Wholesale, Distributor, Corporate can have any payment terms
      default:
        break;
    }
  }

  /**
   * Validates address requirements
   * @param command - Create customer command
   * @throws {Error} When address requirements are not met
   */
  private validateAddressRequirements(command: CreateCustomerCommand): void {
    const addresses = command.addresses;

    // At least one address is required (already validated by schema)
    if (addresses.length === 0) {
      throw new Error('At least one address is required');
    }

    // Check for default address
    const defaultAddresses = addresses.filter((addr) => addr.isDefault === true);
    if (defaultAddresses.length === 0) {
      throw new Error('At least one address must be marked as default');
    } else if (defaultAddresses.length > 1) {
      throw new Error('Only one address can be marked as default');
    }

    // Validate address types
    const billingAddresses = addresses.filter((addr) => addr.addressType === 'BILLING' || addr.addressType === 'BOTH');
    const shippingAddresses = addresses.filter(
      (addr) => addr.addressType === 'SHIPPING' || addr.addressType === 'BOTH'
    );

    if (billingAddresses.length === 0) {
      throw new Error('At least one billing address is required');
    }
    if (shippingAddresses.length === 0) {
      throw new Error('At least one shipping address is required');
    }
  }
}

/**
 * Factory function to create CreateCustomerHandler
 * @param customerRepository - Customer repository implementation
 * @param userRepository - User repository implementation
 * @returns CreateCustomerHandler instance
 */
export function createCustomerHandler(
  customerRepository: ICustomerRepository,
  userRepository: IUserRepository
): CreateCustomerHandler {
  return new CreateCustomerHandler(customerRepository, userRepository);
}
