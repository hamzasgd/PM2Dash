import React, { ReactNode } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';

interface PageContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

/**
 * PageContainer - A consistent container for page content
 * 
 * @param title - The page title
 * @param description - Optional description text
 * @param children - Page content
 * @param actions - Optional actions to display in the header
 */
const PageContainer: React.FC<PageContainerProps> = ({ title, description, children, actions }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1d1f21',
        width: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Header with title */}
      <Box
        sx={{
          p: 2,
          pt: 3,
          pb: description ? 2 : 3,
          backgroundColor: '#1d1f21',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: '#f8f8f2',
              fontFamily: '"SF Mono", monospace',
              fontSize: '1.25rem',
            }}
          >
            {title}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(248, 248, 242, 0.6)',
                mt: 0.5,
                fontFamily: '"SF Mono", monospace',
                fontSize: '0.85rem',
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ ml: 2 }}>
            {actions}
          </Box>
        )}
      </Box>

      {/* Main content */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          backgroundColor: '#1d1f21',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default PageContainer; 