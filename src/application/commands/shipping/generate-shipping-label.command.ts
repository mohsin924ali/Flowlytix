/**
 * Generate Shipping Label Command - Step 3B.3.1
 *
 * Command to generate shipping labels for pending shipments.
 * Handles label generation requests with carrier integration and validation.
 *
 * @domain Order Management - Shipping Operations
 * @pattern Command
 * @version 1.0.0 - Step 3B: Shipping Application Layer
 */
export class GenerateShippingLabelCommand {
  constructor(
    public readonly shippingId: string,
    public readonly userId: string,
    public readonly carrierAccountId?: string,
    public readonly generateInsuranceLabel?: boolean,
    public readonly customInstructions?: string,
    public readonly notes?: string
  ) {}

  /**
   * Validate command data
   */
  validate(): string[] {
    const errors: string[] = [];

    // Required field validation
    if (!this.shippingId?.trim()) {
      errors.push('Shipping ID is required');
    }

    if (!this.userId?.trim()) {
      errors.push('User ID is required');
    }

    // Business rule validation
    if (this.shippingId && this.shippingId.length < 5) {
      errors.push('Shipping ID must be at least 5 characters long');
    }

    if (this.userId && this.userId.length < 3) {
      errors.push('User ID must be at least 3 characters long');
    }

    if (this.carrierAccountId !== undefined && this.carrierAccountId.trim().length === 0) {
      errors.push('Carrier account ID cannot be empty if provided');
    }

    if (this.customInstructions && this.customInstructions.length > 500) {
      errors.push('Custom instructions cannot exceed 500 characters');
    }

    if (this.notes && this.notes.length > 1000) {
      errors.push('Notes cannot exceed 1000 characters');
    }

    return errors;
  }

  /**
   * Check if command requests insurance label
   */
  shouldGenerateInsuranceLabel(): boolean {
    return this.generateInsuranceLabel === true;
  }

  /**
   * Check if command has custom instructions
   */
  hasCustomInstructions(): boolean {
    return !!this.customInstructions?.trim();
  }

  /**
   * Check if command has notes
   */
  hasNotes(): boolean {
    return !!this.notes?.trim();
  }

  /**
   * Get command summary for logging
   */
  getLogSummary(): Record<string, any> {
    return {
      shippingId: this.shippingId,
      userId: this.userId,
      carrierAccountId: this.carrierAccountId,
      generateInsuranceLabel: this.generateInsuranceLabel,
      hasCustomInstructions: this.hasCustomInstructions(),
      hasNotes: this.hasNotes(),
    };
  }
}
