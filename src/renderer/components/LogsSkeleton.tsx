import React from 'react';
import {
  Box,
  Skeleton,
  Paper,
  Stack,
  Divider,
  Typography
} from '@mui/material';

/**
 * LogsSkeleton component displays a loading skeleton for the logs view
 */
const LogsSkeleton: React.FC = () => {
  return (
    <Box>
      {/* Header with title and controls that matches the actual layout */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Skeleton 
          variant="text" 
          width={160} 
          height={32} 
          sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
        />
        
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Process selector dropdown */}
          <Skeleton 
            variant="rectangular" 
            width={200} 
            height={36} 
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px'
            }} 
          />
          
          {/* Filter field */}
          <Skeleton 
            variant="rectangular" 
            width={300} 
            height={36} 
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px'
            }} 
          />
          
          {/* Refresh button */}
          <Skeleton 
            variant="rectangular" 
            width={100} 
            height={36} 
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px'
            }} 
          />
          
          {/* Download button */}
          <Skeleton 
            variant="circular" 
            width={36} 
            height={36} 
            sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
          />
        </Stack>
      </Box>
      
      {/* Logs content skeleton */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 1,
          bgcolor: '#2d2f31',
          overflow: 'auto',
          height: '600px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Log header with timestamp and level */}
        <Box sx={{ display: 'flex', mb: 2 }}>
          <Skeleton 
            variant="text"
            width={140}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              height: 20,
              mr: 2
            }} 
          />
          
          <Skeleton 
            variant="text"
            width={60}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              height: 20,
              mr: 2
            }} 
          />
          
          <Skeleton 
            variant="text"
            width="70%"
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              height: 20
            }} 
          />
        </Box>
        
        <Divider sx={{ my: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.05)' }} />
        
        {/* Generate multiple lines of skeleton text to simulate log entries */}
        {[...Array(15)].map((_, index) => (
          <Box key={index} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex' }}>
              {/* Timestamp */}
              <Skeleton 
                variant="text"
                width={140}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  height: 16,
                  mr: 2
                }} 
              />
              
              {/* Log level */}
              <Skeleton 
                variant="text"
                width={60}
                sx={{ 
                  backgroundColor: index % 5 === 0 ? 'rgba(255, 87, 87, 0.2)' : 
                               index % 5 === 1 ? 'rgba(255, 193, 7, 0.2)' : 
                               'rgba(255, 255, 255, 0.1)',
                  height: 16,
                  mr: 2
                }} 
              />
              
              {/* Log message */}
              <Skeleton 
                variant="text"
                width={`${Math.random() * 50 + 50}%`}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  height: 16
                }} 
              />
            </Box>
            
            {/* Some log entries have additional content */}
            {Math.random() > 0.7 && (
              <Box sx={{ ml: 13, mt: 0.5 }}>
                <Skeleton 
                  variant="text"
                  width={`${Math.random() * 40 + 40}%`}
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    height: 16
                  }} 
                />
              </Box>
            )}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default LogsSkeleton; 