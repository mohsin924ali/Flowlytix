/**
 * useEmployees Hook - Step 5: Frontend Integration
 *
 * Custom hook for employee management operations.
 * Provides clean state management and service integration.
 * Follows established patterns from other hooks in the codebase.
 *
 * @domain Employee Management
 * @architecture Clean Architecture - Presentation Layer Hook
 * @version 1.0.0 - Step 5: Frontend Integration
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Employee,
  EmployeeService,
  ListEmployeesParams,
  CreateEmployeeParams,
  UpdateEmployeeParams,
  EmployeeDepartment,
  EmployeeStatus,
} from '../services/EmployeeService';

/**
 * Employee hook state interface
 */
interface UseEmployeesState {
  employees: Employee[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

/**
 * Employee hook return interface
 */
interface UseEmployeesReturn extends UseEmployeesState {
  // Data operations
  loadEmployees: (params?: ListEmployeesParams) => Promise<void>;
  createEmployee: (params: CreateEmployeeParams) => Promise<void>;
  updateEmployee: (employeeId: string, params: UpdateEmployeeParams) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  getEmployeeById: (employeeId: string) => Promise<Employee | null>;

  // State management
  clearError: () => void;
  refreshEmployees: () => Promise<void>;

  // Utility methods
  getEmployeeByEmployeeId: (employeeId: string) => Employee | undefined;
  getEmployeesByDepartment: (department: EmployeeDepartment) => Employee[];
  getEmployeesByStatus: (status: EmployeeStatus) => Employee[];
  getActiveEmployeesCount: () => number;
  calculateAverageSalary: () => number;
}

/**
 * Employee management hook
 *
 * @param autoLoad - Whether to automatically load employees on mount
 * @param initialParams - Initial parameters for loading employees
 * @returns Employee state and operations
 */
export function useEmployees(autoLoad: boolean = true, initialParams?: ListEmployeesParams): UseEmployeesReturn {
  // State management
  const [state, setState] = useState<UseEmployeesState>({
    employees: [],
    totalCount: 0,
    loading: false,
    error: null,
    creating: false,
    updating: false,
    deleting: false,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<UseEmployeesState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Load employees from service
   */
  const loadEmployees = useCallback(
    async (params?: ListEmployeesParams) => {
      try {
        updateState({ loading: true, error: null });

        console.log('🔄 Loading employees via useEmployees hook...');
        const result = await EmployeeService.listEmployees(params);

        updateState({
          employees: result.employees,
          totalCount: result.totalCount,
          loading: false,
        });

        console.log('✅ Employees loaded successfully:', result.employees.length, 'employees');
      } catch (error) {
        console.error('❌ Failed to load employees:', error);
        updateState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load employees',
        });
      }
    },
    [updateState]
  );

  /**
   * Create new employee
   */
  const createEmployee = useCallback(
    async (params: CreateEmployeeParams) => {
      try {
        updateState({ creating: true, error: null });

        console.log('🔄 Creating employee via useEmployees hook...');
        await EmployeeService.createEmployee(params);

        updateState({ creating: false });

        // Refresh the list after creation
        await loadEmployees(initialParams);

        console.log('✅ Employee created successfully');
      } catch (error) {
        console.error('❌ Failed to create employee:', error);
        updateState({
          creating: false,
          error: error instanceof Error ? error.message : 'Failed to create employee',
        });
        throw error; // Re-throw to allow component-level handling
      }
    },
    [updateState, loadEmployees, initialParams]
  );

  /**
   * Update existing employee
   */
  const updateEmployee = useCallback(
    async (employeeId: string, params: UpdateEmployeeParams) => {
      try {
        updateState({ updating: true, error: null });

        console.log('🔄 Updating employee via useEmployees hook...');
        await EmployeeService.updateEmployee(employeeId, params);

        updateState({ updating: false });

        // Refresh the list after update
        await loadEmployees(initialParams);

        console.log('✅ Employee updated successfully');
      } catch (error) {
        console.error('❌ Failed to update employee:', error);
        updateState({
          updating: false,
          error: error instanceof Error ? error.message : 'Failed to update employee',
        });
        throw error; // Re-throw to allow component-level handling
      }
    },
    [updateState, loadEmployees, initialParams]
  );

  /**
   * Delete employee
   */
  const deleteEmployee = useCallback(
    async (employeeId: string) => {
      try {
        updateState({ deleting: true, error: null });

        console.log('🔄 Deleting employee via useEmployees hook...');
        await EmployeeService.deleteEmployee(employeeId);

        updateState({ deleting: false });

        // Refresh the list after deletion
        await loadEmployees(initialParams);

        console.log('✅ Employee deleted successfully');
      } catch (error) {
        console.error('❌ Failed to delete employee:', error);
        updateState({
          deleting: false,
          error: error instanceof Error ? error.message : 'Failed to delete employee',
        });
        throw error; // Re-throw to allow component-level handling
      }
    },
    [updateState, loadEmployees, initialParams]
  );

  /**
   * Get employee by ID
   */
  const getEmployeeById = useCallback(
    async (employeeId: string): Promise<Employee | null> => {
      try {
        console.log('🔄 Fetching employee by ID via useEmployees hook...');
        const employee = await EmployeeService.getEmployeeById(employeeId);
        console.log('✅ Employee fetched successfully');
        return employee;
      } catch (error) {
        console.error('❌ Failed to fetch employee:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Failed to fetch employee',
        });
        return null;
      }
    },
    [updateState]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Refresh employees list
   */
  const refreshEmployees = useCallback(() => {
    return loadEmployees(initialParams);
  }, [loadEmployees, initialParams]);

  // Utility methods

  /**
   * Find employee by employee ID (from current state)
   */
  const getEmployeeByEmployeeId = useCallback(
    (employeeId: string): Employee | undefined => {
      return state.employees.find((emp) => emp.employeeId === employeeId);
    },
    [state.employees]
  );

  /**
   * Get employees filtered by department (from current state)
   */
  const getEmployeesByDepartment = useCallback(
    (department: EmployeeDepartment): Employee[] => {
      return state.employees.filter((emp) => emp.department === department);
    },
    [state.employees]
  );

  /**
   * Get employees filtered by status (from current state)
   */
  const getEmployeesByStatus = useCallback(
    (status: EmployeeStatus): Employee[] => {
      return state.employees.filter((emp) => emp.status === status);
    },
    [state.employees]
  );

  /**
   * Get count of active employees (from current state)
   */
  const getActiveEmployeesCount = useCallback((): number => {
    return state.employees.filter((emp) => emp.status === EmployeeStatus.ACTIVE).length;
  }, [state.employees]);

  /**
   * Calculate average salary (from current state)
   */
  const calculateAverageSalary = useCallback((): number => {
    const employeesWithSalary = state.employees.filter((emp) => emp.salary !== undefined && emp.salary !== null);
    if (employeesWithSalary.length === 0) return 0;

    const totalSalary = employeesWithSalary.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    return Math.round(totalSalary / employeesWithSalary.length);
  }, [state.employees]);

  // Auto-load employees on mount if requested
  useEffect(() => {
    if (autoLoad) {
      console.log('🚀 useEmployees hook mounted, auto-loading employees...');
      loadEmployees(initialParams);
    }
  }, [autoLoad, loadEmployees, initialParams]);

  // Return hook interface
  return {
    // State
    ...state,

    // Operations
    loadEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeById,

    // State management
    clearError,
    refreshEmployees,

    // Utilities
    getEmployeeByEmployeeId,
    getEmployeesByDepartment,
    getEmployeesByStatus,
    getActiveEmployeesCount,
    calculateAverageSalary,
  };
}
