/**
 * Agency Selector Component
 *
 * Allows super admins to select which agency database to work with
 * for multi-tenant operations. Displays available agencies and manages
 * the agency context switching.
 *
 * Features:
 * - Agency selection dropdown
 * - Current agency display
 * - Context switching
 * - Visual feedback
 * - Error handling
 *
 * @component Molecules/AgencySelector
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../atoms/Button/Button';
import { useAuthStore } from '../../../store/auth.store';
import { AgencyService } from '../../../services/AgencyService';

/**
 * Agency option for selection
 */
interface AgencyOption {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  contactPerson: string;
  email: string;
}

/**
 * Current agency context
 */
interface CurrentAgencyContext {
  agencyId: string;
  agencyName: string;
  isSet: boolean;
}

/**
 * Component props
 */
interface AgencySelectorProps {
  onAgencySelected?: (agencyId: string, agencyName: string) => void;
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Agency Selector Component
 */
export const AgencySelector: React.FC<AgencySelectorProps> = ({
  onAgencySelected,
  showLabel = true,
  compact = false,
  className = '',
}) => {
  // State
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [currentContext, setCurrentContext] = useState<CurrentAgencyContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);
  const [error, setError] = useState<string>('');

  // Auth store
  const { user } = useAuthStore();

  /**
   * Load available agencies
   */
  const loadAgencies = async () => {
    try {
      setIsLoadingAgencies(true);
      setError('');

      const result = await AgencyService.listAgencies();

      if (result.agencies) {
        const agencyOptions: AgencyOption[] = result.agencies.map((agency) => ({
          id: agency.id,
          name: agency.name,
          status: agency.status as 'active' | 'inactive',
          contactPerson: agency.contactPerson || '',
          email: agency.email || '',
        }));

        setAgencies(agencyOptions);

        // Auto-select first agency if none selected and user is super admin
        if (!selectedAgencyId && agencyOptions.length > 0 && user?.role === 'super_admin') {
          setSelectedAgencyId(agencyOptions[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading agencies:', error);
      setError('Error loading agencies');
    } finally {
      setIsLoadingAgencies(false);
    }
  };

  /**
   * Handle agency selection
   */
  const handleAgencySelection = async (agencyId: string) => {
    if (!agencyId || !user?.id) return;

    try {
      setIsLoading(true);
      setError('');

      const selectedAgency = agencies.find((a) => a.id === agencyId);
      if (!selectedAgency) {
        setError('Selected agency not found');
        return;
      }

      // Switch agency context through service
      const result = await AgencyService.switchAgency(agencyId, selectedAgency.name);

      if (result.success) {
        setSelectedAgencyId(agencyId);
        setCurrentContext({
          agencyId,
          agencyName: selectedAgency.name,
          isSet: true,
        });

        // Notify parent component
        onAgencySelected?.(agencyId, selectedAgency.name);

        console.log(`✅ Agency context set to: ${selectedAgency.name}`);
      } else {
        setError(result.message || 'Failed to set agency context');
      }
    } catch (error) {
      console.error('Error setting agency context:', error);
      setError(error instanceof Error ? error.message : 'Error setting agency context');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle selection change
   */
  const handleSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const agencyId = event.target.value;
    if (agencyId) {
      handleAgencySelection(agencyId);
    }
  };

  // Load agencies on mount
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadAgencies();
    }
  }, [user]);

  // Don't render for non-super admins
  if (user?.role !== 'super_admin') {
    return null;
  }

  // Loading state
  if (isLoadingAgencies) {
    return <div className='text-center'>Loading agencies...</div>;
  }

  return (
    <div className={`agency-selector ${className}`}>
      {showLabel && <label className='block text-sm font-medium text-gray-700'>Select Agency</label>}
      <div className='mt-1'>
        <div className='relative'>
          <select
            value={selectedAgencyId}
            onChange={handleSelectionChange}
            disabled={isLoading}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              compact ? 'py-1' : 'py-2'
            }`}
          >
            <option value=''>Select an agency...</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
          {isLoading && (
            <div className='absolute inset-y-0 right-0 flex items-center pr-3'>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500'></div>
            </div>
          )}
        </div>
      </div>
      {error && <div className='mt-2 text-sm text-red-600'>{error}</div>}
    </div>
  );
};

export default AgencySelector;
