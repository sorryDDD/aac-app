import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import AppsIcon from '@mui/icons-material/Apps';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAacStore } from '../store/aacStore';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const presentationMode = useAacStore((state) => state.presentationMode);

  return (
    <Box className={`appShell ${presentationMode ? 'appShellPresentation' : ''}`}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        className={`topAppBar ${presentationMode ? 'topAppBarPresentation' : ''}`}
      >
        <Toolbar className="topToolbar">
          <Typography component="div" className="appBrand">
            AAC Board Studio
          </Typography>
          <Box component="nav" className="mainNav" aria-label="주요 화면">
            <Button
              component={RouterLink}
              to="/buttons"
              startIcon={<AppsIcon />}
              variant={location.pathname.startsWith('/buttons') ? 'contained' : 'text'}
            >
              버튼 제작
            </Button>
            <Button
              component={RouterLink}
              to="/boards"
              startIcon={<DashboardCustomizeIcon />}
              variant={location.pathname.startsWith('/boards') ? 'contained' : 'text'}
            >
              보드 편집
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" className={`appMain ${presentationMode ? 'appMainPresentation' : ''}`}>
        {children}
      </Box>
    </Box>
  );
}
