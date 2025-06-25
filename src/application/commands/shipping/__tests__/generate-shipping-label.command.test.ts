import { GenerateShippingLabelCommand } from '../generate-shipping-label.command';

describe('GenerateShippingLabelCommand - Step 3B.3.1', () => {
  describe('validate', () => {
    it('should validate successfully with valid data', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toEqual([]);
    });

    it('should validate successfully with all optional fields', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        'carrier-account-789',
        true,
        'Handle with care',
        'Rush order - expedite processing'
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toEqual([]);
    });

    it('should validate required fields', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        '', // Invalid shipping ID
        '' // Invalid user ID
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Shipping ID is required');
      expect(errors).toContain('User ID is required');
    });

    it('should validate shipping ID length', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        '123', // Too short
        'user-456'
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Shipping ID must be at least 5 characters long');
    });

    it('should validate user ID length', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'us' // Too short
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toContain('User ID must be at least 3 characters long');
    });

    it('should validate carrier account ID when provided', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        '' // Empty carrier account ID
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Carrier account ID cannot be empty if provided');
    });

    it('should validate custom instructions length', () => {
      // Arrange
      const longInstructions = 'a'.repeat(501); // Too long
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        longInstructions
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Custom instructions cannot exceed 500 characters');
    });

    it('should validate notes length', () => {
      // Arrange
      const longNotes = 'a'.repeat(1001); // Too long
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        undefined,
        longNotes
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toContain('Notes cannot exceed 1000 characters');
    });

    it('should allow maximum length custom instructions and notes', () => {
      // Arrange
      const maxInstructions = 'a'.repeat(500);
      const maxNotes = 'b'.repeat(1000);
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        maxInstructions,
        maxNotes
      );

      // Act
      const errors = command.validate();

      // Assert
      expect(errors).toEqual([]);
    });
  });

  describe('utility methods', () => {
    it('should identify insurance label request', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        true // Generate insurance label
      );

      // Act & Assert
      expect(command.shouldGenerateInsuranceLabel()).toBe(true);
    });

    it('should identify no insurance label request', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        false // Don't generate insurance label
      );

      // Act & Assert
      expect(command.shouldGenerateInsuranceLabel()).toBe(false);
    });

    it('should identify undefined insurance label request as false', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456'
        // No insurance label flag
      );

      // Act & Assert
      expect(command.shouldGenerateInsuranceLabel()).toBe(false);
    });

    it('should detect custom instructions', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        'Handle with care'
      );

      // Act & Assert
      expect(command.hasCustomInstructions()).toBe(true);
    });

    it('should detect no custom instructions', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      // Act & Assert
      expect(command.hasCustomInstructions()).toBe(false);
    });

    it('should detect empty custom instructions as false', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        '   ' // Whitespace only
      );

      // Act & Assert
      expect(command.hasCustomInstructions()).toBe(false);
    });

    it('should detect notes', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        undefined,
        'Rush order'
      );

      // Act & Assert
      expect(command.hasNotes()).toBe(true);
    });

    it('should detect no notes', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      // Act & Assert
      expect(command.hasNotes()).toBe(false);
    });

    it('should detect empty notes as false', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        undefined,
        undefined,
        undefined,
        '   ' // Whitespace only
      );

      // Act & Assert
      expect(command.hasNotes()).toBe(false);
    });
  });

  describe('getLogSummary', () => {
    it('should return complete log summary', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand(
        'shipping-123',
        'user-456',
        'carrier-789',
        true,
        'Handle with care',
        'Rush order'
      );

      // Act
      const summary = command.getLogSummary();

      // Assert
      expect(summary).toEqual({
        shippingId: 'shipping-123',
        userId: 'user-456',
        carrierAccountId: 'carrier-789',
        generateInsuranceLabel: true,
        hasCustomInstructions: true,
        hasNotes: true,
      });
    });

    it('should return minimal log summary', () => {
      // Arrange
      const command = new GenerateShippingLabelCommand('shipping-123', 'user-456');

      // Act
      const summary = command.getLogSummary();

      // Assert
      expect(summary).toEqual({
        shippingId: 'shipping-123',
        userId: 'user-456',
        carrierAccountId: undefined,
        generateInsuranceLabel: undefined,
        hasCustomInstructions: false,
        hasNotes: false,
      });
    });
  });
});
