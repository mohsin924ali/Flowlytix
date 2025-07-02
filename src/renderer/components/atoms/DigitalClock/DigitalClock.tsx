/**
 * Digital Clock Component
 * Professional calendar-style clock for dashboard
 * Following Instructions file standards with strict TypeScript compliance
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, useTheme, Paper } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Component Props
 */
export interface DigitalClockProps {
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Color variant */
  color?: 'primary' | 'secondary' | 'default';
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

/**
 * Format time helper
 */
const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const timeString = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return `${timeString} ${period}`;
};

/**
 * Format date components
 */
const formatDateComponents = (date: Date) => {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();

  return { weekday, month, day, year };
};

/**
 * Get size styles
 */
const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        timeSize: '1.1rem',
        daySize: '1.8rem',
        monthSize: '0.7rem',
        weekdaySize: '0.65rem',
        yearSize: '0.65rem',
        padding: 1.5,
        gap: 1,
      };
    case 'medium':
      return {
        timeSize: '1.3rem',
        daySize: '2.2rem',
        monthSize: '0.8rem',
        weekdaySize: '0.75rem',
        yearSize: '0.75rem',
        padding: 2,
        gap: 1.5,
      };
    case 'large':
      return {
        timeSize: '1.6rem',
        daySize: '2.8rem',
        monthSize: '1rem',
        weekdaySize: '0.9rem',
        yearSize: '0.9rem',
        padding: 2.5,
        gap: 2,
      };
    default:
      return {
        timeSize: '1.1rem',
        daySize: '1.8rem',
        monthSize: '0.7rem',
        weekdaySize: '0.65rem',
        yearSize: '0.65rem',
        padding: 1.5,
        gap: 1,
      };
  }
};

/**
 * Digital Clock Component
 */
export const DigitalClock: React.FC<DigitalClockProps> = ({
  size = 'small',
  color = 'primary',
  'data-testid': testId = 'digital-clock',
}) => {
  const theme = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const styles = getSizeStyles(size);

  // Update time every minute (no seconds needed)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Get color based on variant
  const getColor = () => {
    switch (color) {
      case 'primary':
        return theme.palette.primary.main;
      case 'secondary':
        return theme.palette.secondary.main;
      default:
        return theme.palette.text.primary;
    }
  };

  const clockColor = getColor();
  const { weekday, month, day, year } = formatDateComponents(currentTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      data-testid={testId}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: styles.gap,
          p: styles.padding,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
          backdropFilter: 'blur(12px)',
          borderRadius: 2.5,
          border: '1px solid rgba(81, 63, 242, 0.15)',
          boxShadow: '0 4px 20px rgba(81, 63, 242, 0.08)',
          minWidth: 'fit-content',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 25px rgba(81, 63, 242, 0.12)',
          },
        }}
      >
        {/* Calendar Date Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 'fit-content',
            px: 1,
          }}
        >
          {/* Month */}
          <Typography
            variant='caption'
            sx={{
              fontSize: styles.monthSize,
              fontWeight: 600,
              color: clockColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}
          >
            {month}
          </Typography>

          {/* Day */}
          <Typography
            variant='h4'
            sx={{
              fontSize: styles.daySize,
              fontWeight: 700,
              color: clockColor,
              lineHeight: 1,
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {day}
          </Typography>

          {/* Year */}
          <Typography
            variant='caption'
            sx={{
              fontSize: styles.yearSize,
              fontWeight: 500,
              color: theme.palette.text.secondary,
              lineHeight: 1,
            }}
          >
            {year}
          </Typography>
        </Box>

        {/* Divider */}
        <Box
          sx={{
            width: '1px',
            height: '40px',
            background: `linear-gradient(to bottom, transparent, ${clockColor}40, transparent)`,
            margin: '0 4px',
          }}
        />

        {/* Time Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            minWidth: 'fit-content',
          }}
        >
          {/* Time */}
          <motion.div
            key={formatTime(currentTime)}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Typography
              variant='h6'
              sx={{
                fontSize: styles.timeSize,
                fontWeight: 600,
                color: clockColor,
                fontFamily: 'monospace',
                letterSpacing: '0.02em',
                lineHeight: 1.2,
              }}
            >
              {formatTime(currentTime)}
            </Typography>
          </motion.div>

          {/* Weekday */}
          <Typography
            variant='caption'
            sx={{
              fontSize: styles.weekdaySize,
              fontWeight: 500,
              color: theme.palette.text.secondary,
              textTransform: 'capitalize',
              lineHeight: 1,
              mt: 0.25,
            }}
          >
            {weekday}
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default DigitalClock;
