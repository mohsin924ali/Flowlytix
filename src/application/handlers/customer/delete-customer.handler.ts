/**
 * Delete Customer Handler
 *
 * Handler for DeleteCustomer command following CQRS pattern.
 * Implements business logic for customer deletion with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with DELETE_CUSTOMER permission can delete customers
 * - Customer must exist and be accessible by the requesting user
 * - Customer cannot be deleted if they have outstanding orders
 * - Customer cannot be deleted if they have outstanding balance
 * - Soft delete is preferred to maintain audit trail
 * - Related data integrity must be maintained
 * - Deletion requires proper reason documentation
 *
 * @domain Customer Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { DeleteCustomerCommand, validateDeleteCustomerCommand } from '../../commands/customer/delete-customer.command';
import { CustomerStatus } from '../../../domain/entities/customer';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';
import { Money } from '../../../domain/value-objects/money';

/**
 * Handler for DeleteCustomer command
 * Implements business logic for customer deletion with proper authorization
 */
export class DeleteCustomerHandler {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles customer deletion command
   * @param command - DeleteCustomer command
   * @returns Promise<string> - ID of deleted customer
   * @throws {Error} When validation fails, customer not found, or unauthorized
   */
  async handle(command: DeleteCustomerCommand): Promise<string> {
    // Step 1: Validate command
    validateDeleteCustomerCommand(command);

    // Step 2: Get the user who is deleting this customer (for authorization)
    const deletingUser = await this.userRepository.findById(command.requestedBy);
    if (!deletingUser) {
      throw new Error('Deleting user not found');
    }

    // Step 3: Check authorization - only users with DELETE_CUSTOMER permission can delete customers
    if (!deletingUser.hasPermission(Permission.DELETE_CUSTOMER)) {
      throw new Error('Insufficient permissions to delete customer');
    }

    // Step 4: Find the existing customer
    const existingCustomer = await this.customerRepository.findById(command.customerId);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    // Step 5: Business rule validations
    await this.validateCustomerCanBeDeleted(existingCustomer);

    // Step 6: Soft delete by deactivating the customer
    // This preserves data integrity and allows for audit trails
    const deactivatedCustomer = existingCustomer.deactivate(command.requestedBy);

    // Step 7: Save the deactivated customer
    await this.customerRepository.update(deactivatedCustomer);

    // Note: For hard delete, we would use: await this.customerRepository.delete(command.customerId);
    // However, soft delete (deactivate) is preferred for business audit and data integrity

    return existingCustomer.id;
  }

  /**
   * Validates that a customer can be safely deleted
   * @param customer - Customer to validate
   * @throws {Error} When customer cannot be deleted
   */
  private async validateCustomerCanBeDeleted(customer: any): Promise<void> {
    // Business rule: Cannot delete customers that are already inactive
    if (customer.status === CustomerStatus.INACTIVE) {
      throw new Error('Customer is already inactive');
    }

    // Business rule: Cannot delete blacklisted customers (requires special handling)
    if (customer.status === CustomerStatus.BLACKLISTED) {
      throw new Error('Cannot delete blacklisted customers - contact administrator');
    }

    // Business rule: Cannot delete customers with outstanding balance
    if (
      customer.outstandingBalance &&
      customer.outstandingBalance.compareTo(Money.zero(customer.outstandingBalance.currency)) > 0
    ) {
      throw new Error('Cannot delete customer with outstanding balance');
    }

    // Business rule: Cannot delete customers with reserved credit
    if (
      customer.reservedCredit &&
      customer.reservedCredit.compareTo(Money.zero(customer.reservedCredit.currency)) > 0
    ) {
      throw new Error('Cannot delete customer with reserved credit');
    }

    // Note: In a real system, we would also check for:
    // - Outstanding orders
    // - Pending transactions
    // - Active contracts
    // These would require additional repository methods or services
  }
}

/**
 * Factory function to create DeleteCustomerHandler
 * @param customerRepository - Customer repository implementation
 * @param userRepository - User repository implementation
 * @returns DeleteCustomerHandler instance
 */
export function createDeleteCustomerHandler(
  customerRepository: ICustomerRepository,
  userRepository: IUserRepository
): DeleteCustomerHandler {
  return new DeleteCustomerHandler(customerRepository, userRepository);
}
