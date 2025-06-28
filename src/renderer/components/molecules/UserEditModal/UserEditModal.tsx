/**
 * User Edit Modal Component
 *
 * Simple modal for editing user information.
 * Follows atomic design principles with basic functionality.
 *
 * @domain User Management
 * @pattern Molecule Component
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { Person as PersonIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';

/**
 * Props interface for UserEditModal
 */
export interface UserEditModalProps {
  readonly open: boolean;
  readonly userId: string | null;
  readonly onClose: () => void;
  readonly onUserUpdated: () => void;
}

/**
 * UserEditModal component implementation
 */
export const UserEditModal: React.FC<UserEditModalProps> = ({ open, userId, onClose, onUserUpdated }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Reset form when modal opens/closes
   */
  useEffect(() => {
    if (open && userId) {
      // TODO: Load user data when backend is ready
      setFirstName('');
      setLastName('');
      setEmail('');
      setError(null);
      setSuccess(null);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setError(null);
      setSuccess(null);
    }
  }, [open, userId]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('All fields are required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement user update when backend is ready
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      setSuccess('User updated successfully');
      onUserUpdated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display='flex' alignItems='center' gap={2}>
            <PersonIcon sx={{ color: 'primary.main' }} />
            <Typography variant='h6' fontWeight='bold'>
              Edit User
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {isLoading ? (
            <Box display='flex' justifyContent='center' alignItems='center' py={4}>
              <CircularProgress size={40} />
            </Box>
          ) : (
            <Box>
              {/* Error/Success Alerts */}
              {error && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity='success' sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              {/* Edit Form */}
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='First Name'
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSaving}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='Last Name'
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSaving}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Email'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSaving}
                    required
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSaving} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
