import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Business, Lock } from '@mui/icons-material';

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  isLoading: boolean;
}

/**
 * Login Page Component
 * Professional login interface for Flowlytix Distribution System
 */
const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoading }) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: LoginFormData) => {
    await onLogin(data);
  };

  /**
   * Toggle password visibility
   */
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container
      maxWidth='sm'
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Business
              sx={{
                fontSize: 48,
                color: 'primary.main',
                mb: 2,
              }}
            />
            <Typography variant='h4' component='h1' gutterBottom>
              Flowlytix
            </Typography>
            <Typography variant='body1' color='text.secondary'>
              Distribution System
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              Sign in to your account
            </Typography>
          </Box>

          {/* Login Form */}
          <Box component='form' onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register('email')}
              fullWidth
              label='Email Address'
              type='email'
              autoComplete='email'
              margin='normal'
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isLoading || isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <Lock color='action' />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              {...register('password')}
              fullWidth
              label='Password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='current-password'
              margin='normal'
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isLoading || isSubmitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      onClick={handleTogglePasswordVisibility}
                      edge='end'
                      disabled={isLoading || isSubmitting}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type='submit'
              fullWidth
              variant='contained'
              size='large'
              disabled={isLoading || isSubmitting}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
              }}
            >
              {isLoading || isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>

          {/* Demo Credentials Info */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant='caption' color='text.secondary' display='block'>
              Demo Credentials:
            </Typography>
            <Typography variant='caption' color='text.secondary' display='block'>
              Email: admin@flowlytix.com
            </Typography>
            <Typography variant='caption' color='text.secondary' display='block'>
              Password: admin123
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPage;
