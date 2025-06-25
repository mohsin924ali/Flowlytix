/**
 * Logo Atom Component
 * Reusable logo component following Atomic Design principles
 * Supports both text and image logos with accessibility and animations
 */

import React, { forwardRef } from 'react';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import { motion } from 'framer-motion';
import { APP_CONFIG, A11Y_CONFIG } from '../../../constants/app.constants';

/**
 * Logo props interface
 */
export interface LogoProps {
  /** Logo variant */
  variant?: 'text' | 'image' | 'combined';
  /** Logo size */
  size?: 'small' | 'medium' | 'large';
  /** Image source for image variant */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Custom styles */
  sx?: SxProps<Theme>;
  /** Logo test id for testing */
  'data-testid'?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  small: {
    fontSize: '1.5rem',
    textFontSize: '1.2rem',
    imageSize: 32,
  },
  medium: {
    fontSize: '2rem',
    textFontSize: '1.6rem',
    imageSize: 48,
  },
  large: {
    fontSize: '2.5rem',
    textFontSize: '2rem',
    imageSize: 64,
  },
} as const;

/**
 * Logo atom component with forwarded ref
 * Supports multiple variants and sizes with animations
 */
export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  (
    {
      variant = 'text',
      size = 'medium',
      src,
      alt = A11Y_CONFIG.ARIA_LABELS.LOGO,
      sx,
      'data-testid': testId = 'logo',
      onClick,
      ...rest
    },
    ref
  ) => {
    const sizeConfig = SIZE_CONFIG[size];

    /**
     * Text logo component with animation
     */
    const TextLogo = (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Typography
          variant='h4'
          component='div'
          sx={{
            fontSize: sizeConfig.fontSize,
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            userSelect: 'none',
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -4,
              left: 0,
              width: '100%',
              height: 2,
              background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
              borderRadius: 1,
              transform: 'scaleX(0)',
              transformOrigin: 'left',
              transition: 'transform 0.3s ease-out',
            },
            '&:hover:after': {
              transform: 'scaleX(1)',
            },
            ...sx,
          }}
          data-testid={`${testId}-text`}
        >
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
            {APP_CONFIG.NAME}
          </motion.span>
        </Typography>
      </motion.div>
    );

    /**
     * Image logo component with animation
     */
    const ImageLogo = src && (
      <motion.div
        initial={{ opacity: 0, rotate: -10, scale: 0.8 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        whileHover={{ scale: 1.05, rotate: 2 }}
      >
        <Box
          component='img'
          src={src}
          alt={alt}
          sx={{
            width: sizeConfig.imageSize,
            height: sizeConfig.imageSize,
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15))',
            },
            ...sx,
          }}
          data-testid={`${testId}-image`}
        />
      </motion.div>
    );

    /**
     * Combined logo component with staggered animation
     */
    const CombinedLogo = (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            ...sx,
          }}
          data-testid={`${testId}-combined`}
        >
          <motion.div
            initial={{ opacity: 0, x: -20, rotate: -10 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {ImageLogo}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Typography
              variant='h5'
              component='div'
              sx={{
                fontSize: sizeConfig.textFontSize,
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                userSelect: 'none',
              }}
            >
              {APP_CONFIG.NAME}
            </Typography>
          </motion.div>
        </Box>
      </motion.div>
    );

    /**
     * Render appropriate logo variant
     */
    const renderLogo = () => {
      switch (variant) {
        case 'image':
          return ImageLogo || TextLogo; // Fallback to text if no image
        case 'combined':
          return CombinedLogo;
        case 'text':
        default:
          return TextLogo;
      }
    };

    return (
      <motion.div
        whileHover={onClick ? { scale: 1.05 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
        transition={{ duration: 0.2 }}
      >
        <Box
          ref={ref}
          component={onClick ? 'button' : 'div'}
          onClick={onClick}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: onClick ? 'pointer' : 'default',
            border: 'none',
            background: 'transparent',
            padding: 0,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 1,
            ...(onClick && {
              '&:hover': {
                '&:before': {
                  opacity: 1,
                  transform: 'scale(1)',
                },
              },
              '&:focus': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle, rgba(25, 118, 210, 0.1) 0%, transparent 70%)',
                opacity: 0,
                transform: 'scale(0.8)',
                transition: 'all 0.3s ease-out',
                borderRadius: 'inherit',
                zIndex: -1,
              },
            }),
          }}
          data-testid={testId}
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          {...rest}
        >
          {renderLogo()}
        </Box>
      </motion.div>
    );
  }
);

// Display name for debugging
Logo.displayName = 'Logo';
