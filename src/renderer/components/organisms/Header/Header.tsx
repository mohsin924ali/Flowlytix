/**
 * Header Component
 * Professional header with breadcrumbs, user profile, and search functionality
 * Following Instructions file standards and atomic design principles
 */

import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  InputBase,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth.store';
import { useNavigationStore } from '../../../store/navigation.store';
import { NAVIGATION_CONFIG } from '../../../constants/navigation.constants';

/**
 * Header Component Props
 */
export interface HeaderProps {
  /** Whether sidebar is open */
  sidebarOpen: boolean;
  /** Whether sidebar is collapsed */
  sidebarCollapsed: boolean;
  /** Toggle sidebar visibility */
  onToggleSidebar: () => void;
  /** Component class name */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Breadcrumb Item Interface
 */
interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

/**
 * Header Component
 */
export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  sidebarCollapsed,
  onToggleSidebar,
  className,
  'data-testid': testId = 'header',
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down(NAVIGATION_CONFIG.MOBILE_BREAKPOINT));

  // Store hooks
  const { user, logout } = useAuthStore();
  const { getRouteByPath } = useNavigationStore();

  // Local state
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = React.useState('');
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Generate breadcrumbs from current route
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Dashboard', path: '/', icon: <HomeIcon fontSize='small' /> }];

    if (pathSegments.length === 0) {
      return breadcrumbs;
    }

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const route = getRouteByPath(currentPath);

      if (route) {
        breadcrumbs.push({
          label: route.label,
          path: currentPath,
        });
      } else {
        // Handle dynamic routes like /customers/123
        const capitalizedSegment = segment.charAt(0).toUpperCase() + segment.slice(1);
        breadcrumbs.push({
          label: capitalizedSegment,
          path: currentPath,
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  /**
   * Handle user menu open
   */
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    setUserMenuAnchor(event.currentTarget);
  };

  /**
   * Handle user menu close
   */
  const handleUserMenuClose = (): void => {
    setUserMenuAnchor(null);
  };

  /**
   * Handle notification menu open
   */
  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    setNotificationMenuAnchor(event.currentTarget);
  };

  /**
   * Handle notification menu close
   */
  const handleNotificationMenuClose = (): void => {
    setNotificationMenuAnchor(null);
  };

  /**
   * Handle search submit
   */
  const handleSearchSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (searchValue.trim()) {
      console.log('Search:', searchValue);
      // TODO: Implement search functionality
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = (): void => {
    logout();
    handleUserMenuClose();
    navigate('/login');
  };

  /**
   * Handle theme toggle
   */
  const handleThemeToggle = (): void => {
    setIsDarkMode(!isDarkMode);
    // TODO: Implement theme switching
  };

  /**
   * Handle breadcrumb navigation
   */
  const handleBreadcrumbClick = (path: string): void => {
    navigate(path);
  };

  // Calculate header height and sidebar width for positioning
  const sidebarWidth = sidebarCollapsed ? NAVIGATION_CONFIG.SIDEBAR_COLLAPSED_WIDTH : NAVIGATION_CONFIG.SIDEBAR_WIDTH;

  return (
    <AppBar
      position='fixed'
      elevation={0}
      data-testid={testId}
      className={className || ''}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        left: isMobile ? 0 : sidebarWidth,
        width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        transition: theme.transitions.create(['width', 'left'], {
          easing: theme.transitions.easing.sharp,
          duration: NAVIGATION_CONFIG.ANIMATION_DURATION,
        }),
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar
        sx={{
          minHeight: NAVIGATION_CONFIG.HEADER_HEIGHT,
          px: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Mobile Menu Toggle */}
        {isMobile && (
          <IconButton
            edge='start'
            color='inherit'
            aria-label='toggle sidebar'
            onClick={onToggleSidebar}
            sx={{
              mr: 1,
              color: theme.palette.text.primary,
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Breadcrumbs */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && (
                  <ChevronRightIcon
                    sx={{
                      mx: 1,
                      fontSize: 16,
                      color: theme.palette.text.secondary,
                    }}
                  />
                )}
                <Box
                  component='button'
                  onClick={() => handleBreadcrumbClick(crumb.path)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 1,
                    color: index === breadcrumbs.length - 1 ? theme.palette.primary.main : theme.palette.text.secondary,
                    fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  {crumb.icon}
                  <Typography
                    variant='body2'
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: { xs: 100, sm: 200 },
                    }}
                  >
                    {crumb.label}
                  </Typography>
                </Box>
              </React.Fragment>
            ))}
          </motion.div>
        </Box>

        {/* Search Bar */}
        <Box
          component='form'
          onSubmit={handleSearchSubmit}
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.common.white, 0.1),
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              '&:hover': {
                backgroundColor: alpha(theme.palette.common.white, 0.15),
              },
              '&:focus-within': {
                backgroundColor: alpha(theme.palette.common.white, 0.2),
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
              },
              transition: 'all 0.2s ease',
              width: searchFocused ? 300 : 200,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <SearchIcon
                sx={{
                  fontSize: 20,
                  color: theme.palette.text.secondary,
                }}
              />
            </Box>
            <InputBase
              placeholder='Search...'
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              inputProps={{ 'aria-label': 'search' }}
              sx={{
                color: 'inherit',
                width: '100%',
                '& .MuiInputBase-input': {
                  padding: '8px 12px 8px 40px',
                  fontSize: '0.875rem',
                  transition: theme.transitions.create('width'),
                  width: '100%',
                },
              }}
            />
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Search Icon for Mobile */}
          <IconButton
            sx={{
              display: { xs: 'flex', md: 'none' },
              color: theme.palette.text.primary,
            }}
            aria-label='search'
          >
            <SearchIcon />
          </IconButton>

          {/* Theme Toggle */}
          <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
              onClick={handleThemeToggle}
              sx={{ color: theme.palette.text.primary }}
              aria-label='toggle theme'
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title='Notifications'>
            <IconButton
              onClick={handleNotificationMenuOpen}
              sx={{ color: theme.palette.text.primary }}
              aria-label='notifications'
            >
              <Badge badgeContent={3} color='error'>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Profile */}
          <Tooltip title='User Profile'>
            <IconButton onClick={handleUserMenuOpen} sx={{ p: 0.5 }} aria-label='user profile'>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.palette.primary.main,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {user?.firstName?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          onClick={handleUserMenuClose}
          PaperProps={{
            elevation: 8,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 200,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => navigate('/profile')}>
            <PersonIcon sx={{ mr: 1 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={() => navigate('/settings')}>
            <SettingsIcon sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>

        {/* Notification Menu */}
        <Menu
          anchorEl={notificationMenuAnchor}
          open={Boolean(notificationMenuAnchor)}
          onClose={handleNotificationMenuClose}
          PaperProps={{
            elevation: 8,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 300,
              maxHeight: 400,
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
          </Box>
          <MenuItem>
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                New order received
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Order #12345 from Customer ABC
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem>
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                Low inventory alert
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Product XYZ is running low
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem>
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                Shipment delivered
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Tracking #67890 has been delivered
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
