import React from 'react';
import {
  Box,
  Skeleton,
  TableCell,
  TableRow,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Paper
} from '@mui/material';

interface ProcessSkeletonProps {
  rows?: number;
}

/**
 * ProcessSkeleton component displays a loading skeleton for the process list
 */
const ProcessSkeleton: React.FC<ProcessSkeletonProps> = ({ rows = 5 }) => {
  return (
    <TableContainer 
      component={Paper} 
      elevation={0}
      sx={{
        backgroundColor: '#2d2f31',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        '& .MuiTableCell-root': {
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontFamily: '"SF Mono", monospace',
          fontSize: '0.85rem',
          padding: '12px 16px'
        }
      }}
    >
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Name</TableCell>
            <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>CPU</TableCell>
            <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Memory</TableCell>
            <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Uptime</TableCell>
            <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>PID</TableCell>
            <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(rows)].map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton 
                  variant="text" 
                  width={120} 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                />
              </TableCell>
              <TableCell>
                <Skeleton 
                  variant="rectangular" 
                  width={80} 
                  height={24} 
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px'
                  }} 
                />
              </TableCell>
              <TableCell>
                <Skeleton 
                  variant="text" 
                  width={60} 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton 
                    variant="circular" 
                    width={16} 
                    height={16} 
                    sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      marginRight: 1 
                    }} 
                  />
                  <Skeleton 
                    variant="text" 
                    width={60} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton 
                    variant="circular" 
                    width={16} 
                    height={16} 
                    sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      marginRight: 1 
                    }} 
                  />
                  <Skeleton 
                    variant="text" 
                    width={60} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Skeleton 
                  variant="text" 
                  width={40} 
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Skeleton 
                    variant="circular" 
                    width={24} 
                    height={24} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                  <Skeleton 
                    variant="circular" 
                    width={24} 
                    height={24} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                  <Skeleton 
                    variant="circular" 
                    width={24} 
                    height={24} 
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                  />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProcessSkeleton; 