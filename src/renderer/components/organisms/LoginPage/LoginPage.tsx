/**
 * LoginPage Organism Component
 * Split-screen login page with animated logo branding and form
 * Following Atomic Design principles with stunning animations and professional styling
 */

import React, { useState, useEffect } from 'react';
import { Box, Container, Paper, Typography, useTheme, useMediaQuery, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { Logo } from '../../atoms';
import { LoginForm } from '../../molecules/LoginForm/LoginForm';
import { APP_CONFIG } from '../../../constants/app.constants';
import logoMainSrc from '../../../assets/images/logo-main.svg';

/**
 * LoginPage props interface
 */
export interface LoginPageProps {
  /** Login success callback */
  onLoginSuccess?: () => void;
  /** Custom logo source */
  logoSrc?: string;
  /** Show development mode indicator */
  showDevMode?: boolean;
  /** Page test id for testing */
  'data-testid'?: string;
}

/**
 * Animation variants for staggered animations
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const leftSideVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
};

const rightSideVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
};

/**
 * Animated background elements
 */
const AnimatedBackground: React.FC = () => (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  >
    {/* Animated circles */}
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        style={{
          position: 'absolute',
          width: Math.random() * 100 + 50,
          height: Math.random() * 100 + 50,
          borderRadius: '50%',
          background: `linear-gradient(135deg, rgba(81, 63, 242, ${Math.random() * 0.15 + 0.05}) 0%, rgba(107, 82, 245, ${Math.random() * 0.1 + 0.03}) 100%)`,
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        initial={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        }}
        animate={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        }}
        transition={{
          duration: Math.random() * 25 + 15,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'linear',
        }}
      />
    ))}
  </Box>
);

/**
 * Hook to check if logo image exists
 */
const useLogoExists = (logoSrc?: string) => {
  const [logoExists, setLogoExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!logoSrc) {
      console.log('No logo source provided, using text logo');
      setLogoExists(false);
      setLoading(false);
      return;
    }

    console.log('Attempting to load logo from:', logoSrc);
    const img = new Image();
    img.onload = () => {
      console.log('Logo loaded successfully:', logoSrc);
      setLogoExists(true);
      setLoading(false);
    };
    img.onerror = (error) => {
      console.error('Failed to load logo:', logoSrc, error);
      setLogoExists(false);
      setLoading(false);
    };
    img.src = logoSrc;
  }, [logoSrc]);

  return { logoExists, loading };
};

/**
 * Logo branding section with animations
 */
const LogoBrandingSection: React.FC<{ logoSrc?: string | undefined }> = ({ logoSrc }) => {
  const { logoExists, loading } = useLogoExists(logoSrc);

  console.log('LogoBrandingSection: logoSrc =', logoSrc, 'logoExists =', logoExists, 'loading =', loading);

  return (
    <motion.div
      variants={leftSideVariants}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Animated logo container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
          style={{ position: 'relative', marginBottom: '2rem' }}
        >
          {/* Animated rings around logo */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: -30,
              left: -30,
              right: -30,
              bottom: -30,
              border: '2px solid rgba(81, 63, 242, 0.2)',
              borderRadius: '50%',
              borderTop: '2px solid rgba(81, 63, 242, 0.6)',
            }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: -20,
              left: -20,
              right: -20,
              bottom: -20,
              border: '1px solid rgba(107, 82, 245, 0.3)',
              borderRadius: '50%',
              borderBottom: '1px solid rgba(107, 82, 245, 0.8)',
            }}
          />

          {/* Logo with pulsing effect */}
          <motion.div
            animate={{
              boxShadow: ['0 0 0 0 rgba(81, 63, 242, 0.4)', '0 0 0 20px rgba(81, 63, 242, 0)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              borderRadius: '50%',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            {loading ? (
              // Show loading state
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}
              >
                ⏳
              </Box>
            ) : logoExists && logoSrc ? (
              // Show image logo
              <Logo
                variant='image'
                src={logoSrc}
                size='xlarge'
                circular={true}
                sx={{
                  filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.1))',
                }}
              />
            ) : (
              // Show enhanced text logo
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                F
              </Box>
            )}
          </motion.div>
        </motion.div>

        {/* Brand name with gradient text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Typography
            variant='h2'
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 50%, #513ff2 100%)',
              backgroundSize: '200% 200%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              letterSpacing: '-0.02em',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              textShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <motion.span
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              {APP_CONFIG.NAME}
            </motion.span>
          </Typography>
        </motion.div>

        {/* Tagline with typewriter effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <Typography
            variant='h5'
            sx={{
              fontWeight: 400,
              color: 'rgba(0, 0, 0, 0.7)',
              mb: 1,
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              letterSpacing: '0.01em',
            }}
          >
            {APP_CONFIG.DESCRIPTION}
          </Typography>
        </motion.div>

        {/* Subtitle */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.5 }}>
          <Typography
            variant='body1'
            sx={{
              color: 'rgba(0, 0, 0, 0.5)',
              fontStyle: 'italic',
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            }}
          >
            Streamline your distribution operations
          </Typography>
        </motion.div>

        {/* Floating decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(81, 63, 242, 0.1) 0%, rgba(107, 82, 245, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            bottom: '30%',
            right: '15%',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(107, 82, 245, 0.1) 0%, rgba(81, 63, 242, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            animate={{ y: [10, -10, 10] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
      </Box>
    </motion.div>
  );
};

/**
 * LoginPage organism component
 * Split-screen design with animated branding and form
 */
export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  logoSrc, // Will be set by the parent component
  showDevMode = true,
  'data-testid': testId = 'login-page',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Use the correct path for the built assets
  const defaultLogoSrc = logoMainSrc;
  const finalLogoSrc = logoSrc || defaultLogoSrc;

  console.log('LoginPage: Using logo source:', finalLogoSrc);

  // Mobile layout - stacked vertically
  if (isMobile) {
    return (
      <Box
        data-testid={testId}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background: `
            radial-gradient(circle at 20% 80%, rgba(81, 63, 242, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(107, 82, 245, 0.15) 0%, transparent 50%),
            linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)
          `,
          overflow: 'hidden',
        }}
      >
        <AnimatedBackground />
        <Container
          maxWidth='sm'
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 4,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <motion.div variants={containerVariants} initial='hidden' animate='visible'>
            {/* Mobile logo section */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <LogoBrandingSection logoSrc={finalLogoSrc} />
            </Box>

            {/* Mobile form section */}
            <motion.div variants={rightSideVariants}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 3,
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
                }}
              >
                <LoginForm
                  {...(onLoginSuccess && { onSubmit: onLoginSuccess })}
                  showDevCredentials={showDevMode}
                  data-testid={`${testId}-form`}
                />
              </Paper>
            </motion.div>
          </motion.div>
        </Container>
      </Box>
    );
  }

  // Desktop layout - split screen
  return (
    <Box
      data-testid={testId}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground />

      <Grid container sx={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {/* Left side - Logo and branding */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `
                            radial-gradient(circle at 30% 70%, rgba(81, 63, 242, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 70% 30%, rgba(107, 82, 245, 0.15) 0%, transparent 50%),
                linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)
              `,
              position: 'relative',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: 1,
                background: 'linear-gradient(180deg, transparent, rgba(81, 63, 242, 0.2), transparent)',
              },
            }}
          >
            <Container maxWidth='sm'>
              <LogoBrandingSection logoSrc={finalLogoSrc} />
            </Container>
          </Box>
        </Grid>

        {/* Right side - Login form */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `
                            radial-gradient(circle at 70% 30%, rgba(81, 63, 242, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 30% 70%, rgba(107, 82, 245, 0.08) 0%, transparent 50%),
                linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)
              `,
              position: 'relative',
            }}
          >
            <Container maxWidth='sm'>
              <motion.div variants={rightSideVariants} initial='hidden' animate='visible'>
                <Paper
                  elevation={0}
                  sx={{
                    p: 5,
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 4,
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: 'linear-gradient(90deg, transparent, rgba(81, 63, 242, 0.5), transparent)',
                    },
                  }}
                >
                  <LoginForm
                    {...(onLoginSuccess && { onSubmit: onLoginSuccess })}
                    showDevCredentials={showDevMode}
                    data-testid={`${testId}-form`}
                  />
                </Paper>
              </motion.div>
            </Container>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

// Display name for debugging
LoginPage.displayName = 'LoginPage';
