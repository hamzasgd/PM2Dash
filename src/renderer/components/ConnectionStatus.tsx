import React from 'react';
import { Box, Typography, Button, Paper, Alert, AlertTitle } from '@mui/material';
import { MdWifi, MdArrowForward } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

interface ConnectionStatusProps {
  showButton?: boolean;
  title?: string;
  message?: string;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showButton = true,
  title = 'Not Connected',
  message = 'Please connect to an SSH server to use this feature.',
  className
}) => {
  const navigate = useNavigate();

  return (
    <Box className={className} sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      p: 3
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          maxWidth: 500, 
          width: '100%', 
          p: 3, 
          textAlign: 'center',
          borderRadius: 2,
          background: 'rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Alert 
          severity="warning" 
          variant="outlined"
          sx={{ 
            mb: 3,
            '& .MuiAlert-icon': {
              fontSize: '2rem'
            }
          }}
        >
          <AlertTitle sx={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</AlertTitle>
          <Typography variant="body1">{message}</Typography>
        </Alert>

        {showButton && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<MdWifi />}
            endIcon={<MdArrowForward />}
            onClick={() => navigate('/connections')}
            sx={{ mt: 2, px: 3, py: 1 }}
          >
            Go to Connection Manager
          </Button>
        )}
      </Paper>
    </Box>
  );
};

export default ConnectionStatus; 