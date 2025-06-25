/**
 * Agency Switcher Component
 *
 * Allows super admins to switch between different agencies.
 * Only visible to users with super admin role.
 * Displays current agency and provides dropdown to switch.
 *
 * @domain Agency Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Add as AddIcon,
  SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgencies } from '../../../hooks/useAgencies';
import { Agency } from '../../../services/AgencyService';

/**
 * Agency Switcher Props
 */
export interface AgencySwitcherProps {
  /** Current selected agency ID */
  currentAgencyId?: string | undefined;
  /** Callback when agency is selected */
  onAgencySelect: (agency: Agency) => void;
  /** Callback to create new agency */
  onCreateAgency?: () => void;
  /** Component class name */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Agency Switcher Component
 *
 * Professional agency switcher with dropdown menu and smooth animations.
 * Shows current agency info and allows switching between agencies.
 */
export const AgencySwitcher: React.FC<AgencySwitcherProps> = ({
  currentAgencyId,
  onAgencySelect,
  onCreateAgency,
  className,
  'data-testid': testId = 'agency-switcher',
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Get agencies data
  const { agencies, loading, error, refreshAgencies } = useAgencies({
    autoLoad: true,
    initialPageSize: 100, // Load all agencies for switcher
  });

  // Find current agency
  const currentAgency = agencies.find((agency) => agency.id === currentAgencyId) || agencies[0];

  /**
   * Handle menu open
   */
  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
      // Refresh agencies when opening menu
      refreshAgencies();
    },
    [refreshAgencies]
  );

  /**
   * Handle menu close
   */
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  /**
   * Handle agency selection
   */
  const handleAgencySelect = useCallback(
    (agency: Agency) => {
      onAgencySelect(agency);
      handleMenuClose();
    },
    [onAgencySelect, handleMenuClose]
  );

  /**
   * Handle create agency
   */
  const handleCreateAgency = useCallback(() => {
    if (onCreateAgency) {
      onCreateAgency();
    }
    handleMenuClose();
  }, [onCreateAgency, handleMenuClose]);

  /**
   * Get agency status color
   */
  const getStatusColor = useCallback(
    (status: Agency['status']) => {
      switch (status) {
        case 'active':
          return theme.palette.success.main;
        case 'inactive':
          return theme.palette.warning.main;
        case 'suspended':
          return theme.palette.error.main;
        default:
          return theme.palette.grey[500];
      }
    },
    [theme]
  );

  return (
    <Box className={className} data-testid={testId}>
      <Tooltip title='Switch Agency'>
        <Button
          onClick={handleMenuOpen}
          variant='outlined'
          size='small'
          startIcon={<SwapIcon />}
          endIcon={loading ? <CircularProgress size={16} /> : <ExpandMoreIcon />}
          disabled={loading}
          sx={{
            minWidth: 120,
            textTransform: 'none',
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderColor: alpha(theme.palette.primary.main, 0.2),
            color: theme.palette.text.primary,
            fontWeight: 500,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              borderColor: theme.palette.primary.main,
            },
            '&:disabled': {
              backgroundColor: alpha(theme.palette.grey[300], 0.1),
            },
          }}
        >
          {loading ? 'Loading...' : 'Switch Agency'}
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 8,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 320,
            maxHeight: 400,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              left: 20,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant='h6' sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapIcon fontSize='small' />
            Switch Agency
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            Select an agency to manage its data
          </Typography>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography variant='body2' color='text.secondary'>
              Loading agencies...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Box sx={{ p: 2 }}>
            <Typography variant='body2' color='error'>
              {error}
            </Typography>
          </Box>
        )}

        {/* Agencies List */}
        {!loading && !error && agencies.length > 0 && (
          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            <AnimatePresence>
              {agencies.map((agency) => (
                <motion.div
                  key={agency.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <MenuItem
                    onClick={() => handleAgencySelect(agency)}
                    selected={agency.id === currentAgencyId}
                    sx={{
                      py: 1.5,
                      px: 2,
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {agency.id === currentAgencyId ? (
                        <CheckIcon color='primary' fontSize='small' />
                      ) : (
                        <BusinessIcon color='action' fontSize='small' />
                      )}
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant='body2' sx={{ fontWeight: 500 }}>
                            {agency.name}
                          </Typography>
                          <Chip
                            label={agency.status}
                            size='small'
                            sx={{
                              height: 20,
                              fontSize: '0.6875rem',
                              fontWeight: 500,
                              backgroundColor: alpha(getStatusColor(agency.status), 0.1),
                              color: getStatusColor(agency.status),
                              border: `1px solid ${alpha(getStatusColor(agency.status), 0.3)}`,
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          {agency.contactPerson && (
                            <Typography variant='caption' color='text.secondary'>
                              Contact: {agency.contactPerson}
                            </Typography>
                          )}
                          {agency.email && (
                            <Typography variant='caption' color='text.secondary' sx={{ ml: 1 }}>
                              • {agency.email}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </MenuItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </Box>
        )}

        {/* Empty State */}
        {!loading && !error && agencies.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <BusinessIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant='body2' color='text.secondary' gutterBottom>
              No agencies found
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Create your first agency to get started
            </Typography>
          </Box>
        )}

        {/* Create Agency Option */}
        {onCreateAgency && (
          <>
            <Divider />
            <MenuItem onClick={handleCreateAgency} sx={{ py: 1.5, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AddIcon color='primary' fontSize='small' />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant='body2' color='primary' sx={{ fontWeight: 500 }}>
                    Create New Agency
                  </Typography>
                }
                secondary={
                  <Typography variant='caption' color='text.secondary'>
                    Set up a new distribution agency
                  </Typography>
                }
              />
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};
