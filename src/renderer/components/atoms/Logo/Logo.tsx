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
  size?: 'small' | 'compact' | 'medium' | 'large' | 'xlarge';
  /** Make logo circular */
  circular?: boolean;
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
    imageSize: 40,
  },
  compact: {
    fontSize: '1.75rem',
    textFontSize: '1.4rem',
    imageSize: 56,
  },
  medium: {
    fontSize: '2rem',
    textFontSize: '1.6rem',
    imageSize: 72,
  },
  large: {
    fontSize: '2.5rem',
    textFontSize: '2rem',
    imageSize: 80,
  },
  xlarge: {
    fontSize: '3rem',
    textFontSize: '2.4rem',
    imageSize: 120,
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
      circular = false,
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

    // Removed debug logging for production performance

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
            background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
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
              background: 'linear-gradient(90deg, #513ff2, #6b52f5)',
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
      <Box
        sx={{
          width: sizeConfig.imageSize,
          height: sizeConfig.imageSize,
          borderRadius: circular ? '50%' : 0,
          background: circular
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)'
            : 'transparent',
          padding: circular ? '8px' : 0,
          border: circular ? '2px solid rgba(81, 63, 242, 0.15)' : 'none',
          boxShadow: circular ? '0 4px 20px rgba(81, 63, 242, 0.1)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease-in-out',
          '&:hover': circular
            ? {
                boxShadow: '0 8px 32px rgba(81, 63, 242, 0.2)',
                border: '2px solid rgba(81, 63, 242, 0.3)',
                transform: 'scale(1.05)',
              }
            : {},
        }}
      >
        <motion.div
          initial={{ opacity: 0, rotate: -10, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          whileHover={{
            rotate: circular ? 5 : 2,
          }}
        >
          <Box
            component='img'
            src={src}
            alt={alt}
            onLoad={() => console.log(`Logo loaded successfully: ${src}`)}
            onError={(e) => console.error(`Logo failed to load: ${src}`, e)}
            sx={{
              width: circular ? sizeConfig.imageSize - 32 : sizeConfig.imageSize,
              height: circular ? sizeConfig.imageSize - 32 : sizeConfig.imageSize,
              objectFit: 'cover',
              borderRadius: circular ? '50%' : 'none',
              filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))',
              transition: 'all 0.3s ease-in-out',
              ...sx,
            }}
            data-testid={`${testId}-image`}
          />
        </motion.div>
      </Box>
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
                background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
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
                background: 'radial-gradient(circle, rgba(81, 63, 242, 0.1) 0%, transparent 70%)',
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
