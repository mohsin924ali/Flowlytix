/**
 * Update Customer Handler
 *
 * Handler for UpdateCustomer command following CQRS pattern.
 * Implements business logic for customer updates with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with UPDATE_CUSTOMER permission can update customers
 * - Customer must exist and be accessible by the requesting user
 * - Customer code cannot be changed once set
 * - Email must be unique within agency (if changed)
 * - Credit limit changes require proper authorization and reason
 * - Status changes follow business workflow rules
 * - Address and contact updates maintain data integrity
 *
 * @domain Customer Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  UpdateCustomerCommand,
  validateUpdateCustomerCommand,
  createCustomerUpdateDomainObjects,
} from '../../commands/customer/update-customer.command';
import { Customer, CustomerType, CustomerStatus, PaymentTerms } from '../../../domain/entities/customer';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';
import { Money } from '../../../domain/value-objects/money';
import { Email } from '../../../domain/value-objects/email';

/**
 * Handler for UpdateCustomer command
 * Implements business logic for customer updates with proper authorization
 */
export class UpdateCustomerHandler {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles customer update command
   * @param command - UpdateCustomer command
   * @returns Promise<string> - ID of updated customer
   * @throws {Error} When validation fails, customer not found, or unauthorized
   */
  async handle(command: UpdateCustomerCommand): Promise<string> {
    // Step 1: Validate command
    validateUpdateCustomerCommand(command);

    // Step 2: Get the user who is updating this customer (for authorization)
    const updatingUser = await this.userRepository.findById(command.requestedBy);
    if (!updatingUser) {
      throw new Error('Updating user not found');
    }

    // Step 3: Check authorization - only users with UPDATE_CUSTOMER permission can update customers
    if (!updatingUser.hasPermission(Permission.UPDATE_CUSTOMER)) {
      throw new Error('Insufficient permissions to update customer');
    }

    // Step 4: Find the existing customer
    const existingCustomer = await this.customerRepository.findById(command.customerId);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    // Step 5: Validate business rules for the update
    await this.validateBusinessRules(command, existingCustomer, updatingUser);

    // Step 6: Apply updates to the customer
    let updatedCustomer = existingCustomer;

    // Update basic information
    const basicUpdates = this.extractBasicUpdates(command);
    if (Object.keys(basicUpdates).length > 0) {
      updatedCustomer = updatedCustomer.updateBasicInfo(basicUpdates, command.requestedBy);
    }

    // Update email if provided
    if (command.email !== undefined) {
      const newEmail = new Email(command.email);
      updatedCustomer = updatedCustomer.updateEmail(newEmail, command.requestedBy);
    }

    // Update payment terms if provided
    if (command.paymentTerms !== undefined) {
      this.validatePaymentTermsForCustomerType(
        command.customerType || updatedCustomer.customerType,
        command.paymentTerms
      );
      updatedCustomer = updatedCustomer.updatePaymentTerms(command.paymentTerms, command.requestedBy);
    }

    // Update addresses if provided (replaces all addresses)
    if (command.addresses !== undefined) {
      this.validateAddressRequirements(command.addresses);

      // Convert command addresses to CustomerAddress objects
      const customerAddresses = command.addresses.map((addr) => ({
        street: addr.street || '',
        city: addr.city || '',
        state: addr.state || '',
        zipCode: addr.zipCode || '',
        country: addr.country || '',
        isDefault: addr.isDefault || false,
        addressType: addr.addressType || ('BOTH' as const),
      }));

      updatedCustomer = updatedCustomer.updateAddresses(customerAddresses, command.requestedBy);
    }

    // Update contacts if provided (replaces all contacts)
    if (command.contacts !== undefined) {
      const processedContacts = this.processContactsForUpdate(command.contacts);
      updatedCustomer = updatedCustomer.updateContacts(processedContacts, command.requestedBy);
    }

    // Update credit limit if provided
    if (command.creditLimit !== undefined) {
      if (!command.creditLimitChangeReason) {
        throw new Error('Credit limit change reason is required when updating credit limit');
      }

      const newCreditLimit = Money.fromDecimal(
        command.creditLimit,
        command.creditLimitCurrency || updatedCustomer.creditLimit.currency
      );

      // Validate credit limit authorization
      this.validateCreditLimitAuthorization(newCreditLimit, updatingUser);

      updatedCustomer = updatedCustomer.updateCreditLimit(
        newCreditLimit,
        command.creditLimitChangeReason,
        command.requestedBy
      );
    }

    // Update status if provided
    if (command.status !== undefined) {
      updatedCustomer = this.updateCustomerStatus(updatedCustomer, command.status, command.requestedBy);
    }

    // Step 7: Save the updated customer
    await this.customerRepository.update(updatedCustomer);

    return updatedCustomer.id;
  }

  /**
   * Validates business rules for customer update
   * @param command - Update customer command
   * @param existingCustomer - Existing customer entity
   * @param updatingUser - User performing the update
   * @throws {Error} When business rules are violated
   */
  private async validateBusinessRules(
    command: UpdateCustomerCommand,
    existingCustomer: Customer,
    updatingUser: any
  ): Promise<void> {
    // Check if email is being changed and validate uniqueness
    if (command.email !== undefined && command.email !== existingCustomer.email.value) {
      const email = new Email(command.email);
      const existingCustomerWithEmail = await this.customerRepository.findByEmail(email, existingCustomer.agencyId);
      if (existingCustomerWithEmail && existingCustomerWithEmail.id !== existingCustomer.id) {
        throw new Error('Customer with this email already exists in the agency');
      }
    }

    // Validate customer type changes
    if (command.customerType !== undefined && command.customerType !== existingCustomer.customerType) {
      this.validateCustomerTypeChange(existingCustomer.customerType, command.customerType);
    }

    // Corporate customers must have company name
    const finalCustomerType = command.customerType || existingCustomer.customerType;
    if (finalCustomerType === CustomerType.CORPORATE) {
      const finalCompanyName = command.companyName !== undefined ? command.companyName : existingCustomer.companyName;
      if (!finalCompanyName) {
        throw new Error('Corporate customers must have a company name');
      }
    }

    // Government customers must have tax number
    if (finalCustomerType === CustomerType.GOVERNMENT) {
      const finalTaxNumber = command.taxNumber !== undefined ? command.taxNumber : existingCustomer.taxNumber;
      if (!finalTaxNumber) {
        throw new Error('Government customers must have a tax number');
      }
    }
  }

  /**
   * Extracts basic information updates from command
   * @param command - Update customer command
   * @returns Object with basic update fields
   */
  private extractBasicUpdates(command: UpdateCustomerCommand): any {
    const updates: any = {};

    if (command.companyName !== undefined) {
      updates.companyName = command.companyName;
    }
    if (command.firstName !== undefined) {
      updates.firstName = command.firstName;
    }
    if (command.lastName !== undefined) {
      updates.lastName = command.lastName;
    }
    if (command.phone !== undefined) {
      updates.phone = command.phone;
    }
    if (command.mobile !== undefined) {
      updates.mobile = command.mobile;
    }
    if (command.taxNumber !== undefined) {
      updates.taxNumber = command.taxNumber;
    }
    if (command.website !== undefined) {
      updates.website = command.website;
    }
    if (command.notes !== undefined) {
      updates.notes = command.notes;
    }

    return updates;
  }

  /**
   * Validates customer type changes
   * @param currentType - Current customer type
   * @param newType - New customer type
   * @throws {Error} When customer type change is not allowed
   */
  private validateCustomerTypeChange(currentType: CustomerType, newType: CustomerType): void {
    // Business rule: Some customer type changes are restricted
    const restrictedChanges = [
      // Government customers cannot be changed to other types
      { from: CustomerType.GOVERNMENT, to: [CustomerType.RETAIL, CustomerType.ONLINE] },
      // Corporate customers cannot be downgraded to retail/online
      { from: CustomerType.CORPORATE, to: [CustomerType.RETAIL, CustomerType.ONLINE] },
    ];

    for (const restriction of restrictedChanges) {
      if (restriction.from === currentType && restriction.to.includes(newType)) {
        throw new Error(`Cannot change customer type from ${currentType} to ${newType}`);
      }
    }
  }

  /**
   * Validates payment terms for customer type
   * @param customerType - Customer type
   * @param paymentTerms - Payment terms
   * @throws {Error} When payment terms are invalid for customer type
   */
  private validatePaymentTermsForCustomerType(customerType: CustomerType, paymentTerms: PaymentTerms): void {
    // Business rules for payment terms by customer type (same as create handler)
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
   * Validates address requirements for update
   * @param addresses - Array of addresses
   * @throws {Error} When address requirements are not met
   */
  private validateAddressRequirements(addresses: any[]): void {
    // At least one address is required
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

  /**
   * Processes contacts for update, converting email strings to Email objects
   * @param contacts - Array of contact objects
   * @returns Processed contacts with Email objects
   */
  private processContactsForUpdate(contacts: any[]): any[] {
    return contacts.map((contact) => {
      const processedContact: any = {
        name: contact.name,
      };

      if (contact.title !== undefined) {
        processedContact.title = contact.title;
      }
      if (contact.email !== undefined) {
        processedContact.email = new Email(contact.email);
      }
      if (contact.phone !== undefined) {
        processedContact.phone = contact.phone;
      }
      if (contact.mobile !== undefined) {
        processedContact.mobile = contact.mobile;
      }
      if (contact.isPrimary !== undefined) {
        processedContact.isPrimary = contact.isPrimary;
      }

      return processedContact;
    });
  }

  /**
   * Validates credit limit authorization based on user role
   * @param newCreditLimit - New credit limit
   * @param updatingUser - User updating the customer
   * @throws {Error} When credit limit exceeds user authorization
   */
  private validateCreditLimitAuthorization(newCreditLimit: Money, updatingUser: any): void {
    const maxCreditLimit = this.getMaxCreditLimitForUser(updatingUser);

    if (newCreditLimit.compareTo(maxCreditLimit) > 0) {
      throw new Error(
        `Credit limit ${newCreditLimit.toString()} exceeds maximum allowed ${maxCreditLimit.toString()} for your role`
      );
    }
  }

  /**
   * Gets maximum credit limit allowed for user role
   * @param user - User
   * @returns Maximum credit limit
   */
  private getMaxCreditLimitForUser(user: any): Money {
    // Business rule: Credit limit authorization based on user role (same as create handler)
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
   * Updates customer status with proper business rules
   * @param customer - Customer to update
   * @param newStatus - New status
   * @param userId - User performing the update
   * @returns Updated customer
   * @throws {Error} When status transition is not allowed
   */
  private updateCustomerStatus(customer: Customer, newStatus: CustomerStatus, userId: string): Customer {
    // Apply status change based on the target status
    switch (newStatus) {
      case CustomerStatus.ACTIVE:
        return customer.activate(userId);

      case CustomerStatus.INACTIVE:
        return customer.deactivate(userId);

      case CustomerStatus.SUSPENDED:
        return customer.suspend(userId, 'Status updated via command');

      case CustomerStatus.PENDING_APPROVAL:
        // Only allow transition to pending if currently inactive
        if (customer.status !== CustomerStatus.INACTIVE) {
          throw new Error('Can only set to pending approval from inactive status');
        }
        return customer.deactivate(userId); // Keep as inactive, pending is handled by approval process

      case CustomerStatus.BLACKLISTED:
        return customer.blacklist(userId, 'Status updated via command');

      default:
        throw new Error(`Unsupported status transition to ${newStatus}`);
    }
  }
}

/**
 * Factory function to create UpdateCustomerHandler
 * @param customerRepository - Customer repository implementation
 * @param userRepository - User repository implementation
 * @returns UpdateCustomerHandler instance
 */
export function createUpdateCustomerHandler(
  customerRepository: ICustomerRepository,
  userRepository: IUserRepository
): UpdateCustomerHandler {
  return new UpdateCustomerHandler(customerRepository, userRepository);
}
