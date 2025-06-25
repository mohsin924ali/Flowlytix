/**
 * Sidebar Navigation Component
 * Professional sidebar with animated navigation menu
 * Following Instructions file standards with strict TypeScript compliance
 */

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { ChevronLeft, ChevronRight, ExpandLess, ExpandMore } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../../atoms';
import type { NavigationRoute } from '../../../types/navigation.types';
import logoSrc from '../../../assets/images/logo-main.svg';

/**
 * Sidebar Component Props
 */
interface SidebarProps {
  navigationItems: NavigationRoute[];
  isOpen: boolean;
  isCollapsed: boolean;
  activeRoute: string;
  onToggle: () => void;
  onCollapse: () => void;
  onNavigate: (path: string) => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * Animation variants for sidebar
 */
const sidebarVariants = {
  open: {
    width: 280,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
    },
  },
  collapsed: {
    width: 64,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
    },
  },
};

/**
 * Animation variants for menu items
 */
const menuItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: index * 0.1,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 },
  },
};

/**
 * Sidebar Navigation Component
 */
export const Sidebar: React.FC<SidebarProps> = ({
  navigationItems,
  isOpen,
  isCollapsed,
  activeRoute,
  onToggle,
  onCollapse,
  onNavigate,
  className,
  'data-testid': testId = 'sidebar',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  /**
   * Toggle expanded state for menu items with children
   */
  const handleToggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  /**
   * Check if route is active
   */
  const isRouteActive = (path: string): boolean => {
    if (activeRoute === path) return true;
    if (path !== '/' && activeRoute.startsWith(path)) return true;
    return false;
  };

  /**
   * Handle navigation item click
   */
  const handleNavigationClick = (item: NavigationRoute) => {
    if (item.disabled) return;

    if (item.children && item.children.length > 0) {
      handleToggleExpanded(item.id);
    } else {
      onNavigate(item.path);
      if (isMobile) {
        onToggle(); // Close sidebar on mobile after navigation
      }
    }
  };

  /**
   * Render navigation item
   */
  const renderNavigationItem = (item: NavigationRoute, index: number, isChild = false) => {
    const isActive = isRouteActive(item.path);
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <motion.div
        key={item.id}
        variants={menuItemVariants}
        initial='hidden'
        animate='visible'
        whileHover='hover'
        custom={index}
      >
        <ListItem
          disablePadding
          sx={{
            display: 'block',
            ml: isChild ? 2 : 0,
          }}
        >
          <Tooltip title={isCollapsed && !isChild ? item.description || item.label : ''} placement='right' arrow>
            <ListItemButton
              onClick={() => handleNavigationClick(item)}
              disabled={Boolean(item.disabled)}
              sx={{
                minHeight: 48,
                justifyContent: isCollapsed ? 'center' : 'initial',
                px: 2.5,
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                position: 'relative',
                overflow: 'hidden',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(66, 165, 245, 0.05) 100%)'
                  : 'transparent',
                border: isActive ? '1px solid rgba(25, 118, 210, 0.2)' : '1px solid transparent',
                '&:hover': {
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(66, 165, 245, 0.08) 100%)'
                    : 'rgba(25, 118, 210, 0.04)',
                  border: '1px solid rgba(25, 118, 210, 0.1)',
                  transform: 'translateX(4px)',
                },
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: isActive ? 'linear-gradient(180deg, #1976d2 0%, #42a5f5 100%)' : 'transparent',
                  borderRadius: '0 2px 2px 0',
                },
                transition: theme.transitions.create(['background', 'transform', 'border'], {
                  duration: 200,
                }),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isCollapsed ? 0 : 3,
                  justifyContent: 'center',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  transition: theme.transitions.create('color', { duration: 200 }),
                }}
              >
                <Badge
                  badgeContent={item.badge}
                  color='error'
                  variant='dot'
                  invisible={!item.badge || item.badge === 0}
                >
                  <item.icon sx={{ fontSize: 24 }} />
                </Badge>
              </ListItemIcon>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <ListItemText
                      primary={item.label}
                      sx={{
                        opacity: isCollapsed ? 0 : 1,
                        '& .MuiListItemText-primary': {
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'primary.main' : 'text.primary',
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expand/Collapse icon for items with children */}
              {hasChildren && !isCollapsed && (
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </motion.div>
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>

        {/* Child items */}
        {hasChildren && !isCollapsed && (
          <Collapse in={isExpanded} timeout='auto' unmountOnExit>
            <List component='div' disablePadding>
              {item.children?.map((child: NavigationRoute, childIndex: number) =>
                renderNavigationItem(child, childIndex, true)
              )}
            </List>
          </Collapse>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'open'}
      data-testid={testId}
      style={{
        width: isCollapsed ? 64 : 280,
        height: '100vh',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            minHeight: 64,
          }}
        >
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <Logo variant='image' size='medium' circular={true} src={logoSrc} />
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Flowlytix
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>

          {isCollapsed && <Logo variant='image' size='compact' circular={true} src={logoSrc} />}
        </Box>

        {/* Navigation Menu */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            py: 2,
            '&::-webkit-scrollbar': {
              width: 4,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0, 0, 0, 0.1)',
              borderRadius: 2,
            },
          }}
        >
          <List>{navigationItems.map((item, index) => renderNavigationItem(item, index))}</List>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Typography variant='caption' color='text.secondary' sx={{ textAlign: 'center' }}>
                  © 2024 Flowlytix
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </motion.div>
  );
};
