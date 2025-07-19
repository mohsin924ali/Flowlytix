/**
 * Unit Tests for StatusChip Component
 * Testing the StatusChip atomic component with comprehensive coverage
 * Following Instructions file standards with thorough testing
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { StatusChip } from '../../../src/components/atoms/StatusChip/StatusChip';
import { theme } from '../../../src/styles/theme';
import { SubscriptionStatus } from '../../../src/types';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('StatusChip Component', () => {
  describe('Rendering', () => {
    test('renders successfully with required props', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('Active');
    });

    test('renders with custom label', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} label='Custom Label' />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toHaveTextContent('Custom Label');
    });

    test('renders with showIcon prop', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} showIcon={true} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('Active');
    });

    test('renders with custom data-testid', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} data-testid='custom-chip' />
        </TestWrapper>
      );

      const chip = screen.getByTestId('custom-chip');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('Status Variants', () => {
    test('renders ACTIVE status correctly', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toHaveTextContent('Active');
      expect(chip).toHaveAttribute('data-testid', 'status-chip-active');
    });

    test('renders EXPIRED status correctly', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.EXPIRED} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-expired');
      expect(chip).toHaveTextContent('Expired');
      expect(chip).toHaveAttribute('data-testid', 'status-chip-expired');
    });

    test('renders CANCELLED status correctly', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.CANCELLED} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-cancelled');
      expect(chip).toHaveTextContent('Cancelled');
      expect(chip).toHaveAttribute('data-testid', 'status-chip-cancelled');
    });

    test('renders SUSPENDED status correctly', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.SUSPENDED} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-suspended');
      expect(chip).toHaveTextContent('Suspended');
      expect(chip).toHaveAttribute('data-testid', 'status-chip-suspended');
    });

    test('renders PENDING status correctly', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.PENDING} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-pending');
      expect(chip).toHaveTextContent('Pending');
      expect(chip).toHaveAttribute('data-testid', 'status-chip-pending');
    });
  });

  describe('Accessibility', () => {
    test('has proper test id', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toBeInTheDocument();
    });

    test('supports custom aria-label', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} aria-label='Custom accessibility label' />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toHaveAttribute('aria-label', 'Custom accessibility label');
    });
  });

  describe('Interaction', () => {
    test('handles onClick events', () => {
      const handleClick = jest.fn();

      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} onClick={handleClick} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      chip.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('is disabled when disabled prop is true', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} disabled={true} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toHaveClass('Mui-disabled');
    });
  });

  describe('Styling', () => {
    test('applies custom styling based on status', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toHaveStyle({
        textTransform: 'uppercase',
        fontWeight: '600',
      });
    });

    test('applies custom className', () => {
      render(
        <TestWrapper>
          <StatusChip status={SubscriptionStatus.ACTIVE} className='custom-class' />
        </TestWrapper>
      );

      const chip = screen.getByTestId('status-chip-active');
      expect(chip).toHaveClass('custom-class');
    });
  });

  describe('Error Handling', () => {
    test('handles undefined status gracefully', () => {
      // Suppress console errors for this test
      const originalError = console.error;
      console.error = jest.fn();

      render(
        <TestWrapper>
          <StatusChip status={undefined as any} />
        </TestWrapper>
      );

      // Should not crash and should render something
      const chip = screen.getByTestId('status-chip-undefined');
      expect(chip).toBeInTheDocument();

      // Restore console.error
      console.error = originalError;
    });

    test('handles invalid status gracefully', () => {
      // Suppress console errors for this test
      const originalError = console.error;
      console.error = jest.fn();

      render(
        <TestWrapper>
          <StatusChip status={'invalid' as any} />
        </TestWrapper>
      );

      // Should not crash and should render something
      const chip = screen.getByTestId('status-chip-invalid');
      expect(chip).toBeInTheDocument();

      // Restore console.error
      console.error = originalError;
    });
  });
});
