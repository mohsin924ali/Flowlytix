import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
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
 * Create login form validation schema with translations
 * Following Instructions file standards for proper schema validation
 */
const createLoginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t('forms.required_field')).email(t('forms.invalid_email')),
    password: z.string().min(1, t('forms.required_field')).min(6, t('forms.password_too_short')),
  });

type LoginFormData = {
  email: string;
  password: string;
};

interface LoginPageProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  isLoading: boolean;
}

/**
 * Login Page Component
 * Professional login interface for Flowlytix Distribution System
 * Following Instructions file standards with proper internationalization
 */
const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoading }) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = React.useState(false);

  const loginSchema = React.useMemo(() => createLoginSchema(t), [t]);

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
              {t('auth.welcome_back')}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {t('auth.sign_in_message')}
            </Typography>
          </Box>

          {/* Login Form */}
          <Box component='form' onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register('email')}
              fullWidth
              label={t('auth.email')}
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
              label={t('auth.password')}
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
              {isLoading || isSubmitting ? t('common.loading') : t('auth.login_button')}
            </Button>
          </Box>

          {/* Demo Credentials Info */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant='caption' color='text.secondary' display='block'>
              {t('auth.demo_credentials')}:
            </Typography>
            <Typography variant='caption' color='text.secondary' display='block'>
              {t('auth.email')}: admin@flowlytix.com
            </Typography>
            <Typography variant='caption' color='text.secondary' display='block'>
              {t('auth.password')}: admin123
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPage;
