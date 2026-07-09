import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Alert, Snackbar } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppShell } from './components/AppShell';
import { ButtonMakerPage } from './pages/ButtonMakerPage';
import { BoardEditorPage } from './pages/BoardEditorPage';
import { useAacStore } from './store/aacStore';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f5d63',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#d9654f'
    },
    background: {
      default: '#f6f7f3',
      paper: '#ffffff'
    },
    text: {
      primary: '#1b2528',
      secondary: '#596569'
    }
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: '1.7rem',
      lineHeight: 1.2,
      fontWeight: 850
    },
    h2: {
      fontSize: '1.15rem',
      lineHeight: 1.25,
      fontWeight: 800
    },
    button: {
      fontWeight: 800,
      textTransform: 'none'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 44
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined'
      }
    }
  }
});

export default function App() {
  const loadAll = useAacStore((state) => state.loadAll);
  const error = useAacStore((state) => state.error);
  const clearError = useAacStore((state) => state.clearError);
  const presentationMode = useAacStore((state) => state.presentationMode);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/buttons" replace />} />
            <Route path="/buttons" element={<ButtonMakerPage />} />
            <Route path="/boards" element={<BoardEditorPage />} />
            <Route path="*" element={<Navigate to="/buttons" replace />} />
          </Routes>
        </AppShell>
      </HashRouter>
      <Snackbar open={Boolean(error) && !presentationMode} autoHideDuration={4500} onClose={clearError}>
        <Alert severity="error" onClose={clearError} variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
