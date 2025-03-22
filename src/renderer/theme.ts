import { createTheme, ThemeOptions } from '@mui/material/styles';

export const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff5f57',
      light: '#ff7b74',
      dark: '#cc4c46',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f6be2c',
      light: '#f8cb57',
      dark: '#c59823',
      contrastText: '#000000',
    },
    success: {
      main: '#28c840',
      light: '#53d366',
      dark: '#1ea033',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ff5f57',
      light: '#ff7b74',
      dark: '#cc4c46',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f6be2c',
      light: '#f8cb57',
      dark: '#c59823',
      contrastText: '#000000',
    },
    info: {
      main: '#28c840',
      light: '#53d366',
      dark: '#1ea033',
      contrastText: '#ffffff',
    },
    background: {
      default: '#1d1f21',
      paper: '#2d2f31',
    },
    text: {
      primary: '#f8f8f2',
      secondary: '#b3b3b3',
      disabled: '#7a7a7a',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
    fontSize: 14,
    h1: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 600,
    },
    h2: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 600,
    },
    subtitle1: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 500,
    },
    subtitle2: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 500,
    },
    body1: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
    },
    body2: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
    },
    button: {
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderWidth: 1,
          '&:hover': {
            borderWidth: 1,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 0,
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          height: 6,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.85rem',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minWidth: 100,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
        },
      },
    },
  },
};

const theme = createTheme(themeOptions);

export default theme; 