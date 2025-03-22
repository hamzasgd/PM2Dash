import React from 'react';
import { Box, Grid, Paper, Skeleton } from '@mui/material';

/**
 * DashboardSkeleton component displays a loading skeleton for the dashboard
 */
const DashboardSkeleton: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Stats cards section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[...Array(4)].map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                backgroundColor: '#2d2f31',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Skeleton 
                  variant="text" 
                  width={120} 
                  height={24} 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                />
                <Skeleton 
                  variant="circular" 
                  width={30} 
                  height={30} 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                />
              </Box>
              <Skeleton 
                variant="text" 
                width="60%" 
                height={30} 
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  mb: 1
                }} 
              />
              <Skeleton 
                variant="text" 
                width="80%" 
                height={16} 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
              />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* System information section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#2d2f31',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Skeleton 
                variant="text" 
                width={150} 
                height={32} 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
              />
              <Skeleton 
                variant="circular" 
                width={32} 
                height={32} 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
              />
            </Box>
            
            {/* CPU usage bars */}
            {[...Array(4)].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton 
                    variant="text" 
                    width={80} 
                    height={20} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                  <Skeleton 
                    variant="text" 
                    width={40} 
                    height={20} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                </Box>
                <Skeleton 
                  variant="rectangular" 
                  width="100%" 
                  height={16} 
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px'
                  }} 
                />
              </Box>
            ))}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#2d2f31',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Skeleton 
                variant="text" 
                width={150} 
                height={32} 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
              />
              <Skeleton 
                variant="circular" 
                width={32} 
                height={32} 
                sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
              />
            </Box>
            
            {/* Disk usage */}
            {[...Array(3)].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton 
                    variant="text" 
                    width={120} 
                    height={20} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                  <Skeleton 
                    variant="text" 
                    width={80} 
                    height={20} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                </Box>
                <Skeleton 
                  variant="rectangular" 
                  width="100%" 
                  height={16} 
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px'
                  }} 
                />
              </Box>
            ))}

            {/* Memory usage */}
            <Box sx={{ mt: 3 }}>
              <Skeleton 
                variant="text" 
                width={150} 
                height={24} 
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  mb: 2
                }} 
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Skeleton 
                  variant="text" 
                  width={80} 
                  height={20} 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                />
                <Skeleton 
                  variant="text" 
                  width={60} 
                  height={20} 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                />
              </Box>
              <Skeleton 
                variant="rectangular" 
                width="100%" 
                height={16} 
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px'
                }} 
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardSkeleton; 