import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, Box, Typography } from '@mui/material';
import { Language, KeyboardArrowDown } from '@mui/icons-material';
import { useLanguage } from '../../../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    handleClose();
  };

  const currentLanguage = availableLanguages.find((lang) => lang.code === language);

  return (
    <Box>
      <Button
        id='language-switcher-button'
        aria-controls={open ? 'language-switcher-menu' : undefined}
        aria-haspopup='true'
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        startIcon={<Language />}
        endIcon={<KeyboardArrowDown />}
        sx={{
          color: 'text.secondary',
          textTransform: 'none',
          minWidth: 'auto',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Typography variant='body2' sx={{ ml: 0.5 }}>
          {currentLanguage?.nativeName || 'Language'}
        </Typography>
      </Button>
      <Menu
        id='language-switcher-menu'
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-switcher-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {availableLanguages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={lang.code === language}
            sx={{
              minWidth: 140,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            }}
          >
            <ListItemIcon>
              <Language sx={{ color: lang.code === language ? 'inherit' : 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText>
              <Box>
                <Typography variant='body2' sx={{ fontWeight: lang.code === language ? 600 : 400 }}>
                  {lang.nativeName}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  {lang.name}
                </Typography>
              </Box>
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher;
