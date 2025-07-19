/**
 * LoginPage Organism Component
 * Beautiful animated login page following the loginTest design
 * Following Atomic Design principles with stunning animations and professional styling
 * Implements WCAG 2.1 AA accessibility standards
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Logo } from '../../atoms';
import { LoginForm } from '../../molecules/LoginForm/LoginForm';
import { APP_CONFIG } from '../../../constants/app.constants';

// Logo path corrected to use public directory
const logoMainSrc = '/assets/images/logo-main.svg';

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
 * Animation variants for the main container
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

/**
 * Animation variants for branding section
 */
const brandingVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
};

/**
 * Animation variants for the login card
 */
const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      delay: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Animated Background Components
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
    {/* Animated background elements */}
    <motion.div
      style={{
        position: 'absolute',
        top: '-10rem',
        right: '-10rem',
        width: '20rem',
        height: '20rem',
        background: 'rgba(59, 130, 246, 0.2)',
        borderRadius: '50%',
        filter: 'blur(80px)',
      }}
      animate={{
        x: [0, 100, 0],
        y: [0, -100, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
    <motion.div
      style={{
        position: 'absolute',
        bottom: '-10rem',
        left: '-10rem',
        width: '20rem',
        height: '20rem',
        background: 'rgba(147, 51, 234, 0.2)',
        borderRadius: '50%',
        filter: 'blur(80px)',
      }}
      animate={{
        x: [0, -100, 0],
        y: [0, 100, 0],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
    <motion.div
      style={{
        position: 'absolute',
        top: '10rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '20rem',
        height: '20rem',
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '50%',
        filter: 'blur(80px)',
      }}
      animate={{
        x: [0, 50, 0],
        y: [0, -50, 0],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        ease: 'linear',
      }}
    />

    {/* Floating Particles */}
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        style={{
          position: 'absolute',
          width: '0.5rem',
          height: '0.5rem',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          x: [0, Math.random() * 30 - 15, 0],
          opacity: [0.2, 0.8, 0.2],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
          ease: 'easeInOut',
        }}
      />
    ))}
  </Box>
);

/**
 * Company Branding Header Component
 */
const CompanyBranding: React.FC<{ logoSrc?: string }> = ({ logoSrc }) => {
  const theme = useTheme();
  const [logoExists, setLogoExists] = useState(false);

  useEffect(() => {
    if (!logoSrc) {
      setLogoExists(false);
      return;
    }

    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = logoSrc;
  }, [logoSrc]);

  return (
    <motion.div
      variants={brandingVariants}
      style={{
        textAlign: 'center',
        marginBottom: '2rem',
      }}
    >
      {/* Main Logo Container */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          duration: 1,
          delay: 0.2,
          type: 'spring',
          stiffness: 200,
          damping: 20,
        }}
        style={{
          position: 'relative',
          marginBottom: '1.5rem',
          display: 'inline-block',
        }}
      >
        {/* Logo Background with Glow Effect */}
        <Box
          sx={{
            width: 96,
            height: 96,
            background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
            borderRadius: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: '0 20px 40px rgba(81, 63, 242, 0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated Glow */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '1.5rem',
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Logo or Fallback Icon */}
          {logoExists ? (
            <img
              src={logoSrc}
              alt='Company Logo'
              style={{
                width: 56,
                height: 56,
                objectFit: 'contain',
                position: 'relative',
                zIndex: 10,
              }}
            />
          ) : (
            <motion.svg
              width='40'
              height='40'
              fill='white'
              viewBox='0 0 20 20'
              style={{ position: 'relative', zIndex: 10 }}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <path
                fillRule='evenodd'
                d='M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z'
                clipRule='evenodd'
              />
            </motion.svg>
          )}

          {/* Corner Decorations */}
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 12,
              height: 12,
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              width: 8,
              height: 8,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
            }}
          />
        </Box>

        {/* Floating Ring Animation */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            width: 96,
            height: 96,
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '1.5rem',
            margin: '0 auto',
          }}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 360],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Company Name with Gradient Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <Typography
          variant='h3'
          component='h1'
          sx={{
            fontFamily: '"Bodoni MT", "Libre Bodoni", serif',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 0.5,
            letterSpacing: '0.02em',
          }}
        >
          {APP_CONFIG.COMPANY_NAME}
        </Typography>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <Typography
          variant='body2'
          sx={{
            color: 'rgba(224, 231, 255, 0.7)',
            fontWeight: 300,
            marginBottom: 2,
            fontSize: '0.875rem',
          }}
        >
          By {APP_CONFIG.COMPANY_BY}
        </Typography>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.9 }}>
        <Typography
          variant='h6'
          sx={{
            color: 'rgba(224, 231, 255, 0.9)',
            fontWeight: 500,
            marginBottom: 1,
          }}
        >
          Distribution Dashboard
        </Typography>
      </motion.div>

      {/* Animated Tagline */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      >
        <Box
          sx={{
            display: 'inline-block',
            px: 3,
            py: 0.5,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2rem',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography
            variant='body2'
            sx={{
              color: 'white',
              fontWeight: 500,
            }}
          >
            Your Success, Our Priority
          </Typography>
        </Box>
      </motion.div>
    </motion.div>
  );
};

/**
 * Main LoginPage component
 */
export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  logoSrc,
  showDevMode = true,
  'data-testid': testId = 'login-page',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      data-testid={testId}
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 25%, #3730a3 75%, #581c87 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        style={{
          maxWidth: '28rem',
          width: '100%',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Company Branding Header */}
        <CompanyBranding {...(logoSrc && { logoSrc })} />

        {/* Login Card */}
        <motion.div variants={cardVariants}>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '1.5rem',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Card Background Pattern */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #f1f5f9 0%, #ffffff 50%, #f8fafc 100%)',
                opacity: 0.5,
              }}
            />

            {/* Login Form */}
            <Box sx={{ position: 'relative', zIndex: 10 }}>
              <LoginForm {...(onLoginSuccess && { onSubmit: onLoginSuccess })} data-testid={`${testId}-form`} />
            </Box>
          </Box>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          style={{
            textAlign: 'center',
            marginTop: '2rem',
          }}
        >
          <Typography
            variant='body2'
            sx={{
              color: 'rgba(224, 231, 255, 0.9)',
              marginBottom: 0.5,
            }}
          >
            © 2024 {APP_CONFIG.COMPANY}. All rights reserved.
          </Typography>
          <Typography
            variant='caption'
            sx={{
              color: 'rgba(224, 231, 255, 0.75)',
            }}
          >
            Secure • Reliable • Professional
          </Typography>
        </motion.div>
      </motion.div>
    </Box>
  );
};

// Display name for debugging
LoginPage.displayName = 'LoginPage';
