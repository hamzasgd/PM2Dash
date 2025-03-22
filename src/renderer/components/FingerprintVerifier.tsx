import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Alert, 
  AlertTitle,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@mui/material';
import { MdFingerprint, MdSecurity, MdWarning } from 'react-icons/md';
import { HostFingerprint } from '../types';

interface FingerprintVerifierProps {
  open: boolean;
  fingerprint: HostFingerprint | null;
  isChanged: boolean;
  onVerify: (fingerprint: HostFingerprint) => void;
  onReject: (host: string, port: number) => void;
}

const FingerprintVerifier: React.FC<FingerprintVerifierProps> = ({
  open,
  fingerprint,
  isChanged,
  onVerify,
  onReject
}) => {
  if (!fingerprint) return null;
  
  const handleVerify = () => {
    if (fingerprint) {
      onVerify(fingerprint);
    }
  };
  
  const handleReject = () => {
    if (fingerprint) {
      onReject(fingerprint.host, fingerprint.port);
    }
  };
  
  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isChanged ? (
          <MdWarning color="warning" size={24} />
        ) : (
          <MdFingerprint color="info" size={24} />
        )}
        SSH Host Key Verification
      </DialogTitle>
      <DialogContent>
        <Alert severity={isChanged ? "warning" : "info"}>
          <AlertTitle>{isChanged ? "Host key has changed!" : "New host key"}</AlertTitle>
          {isChanged ? (
            <Typography variant="body2">
              The host key for <strong>{fingerprint.host}:{fingerprint.port}</strong> has changed.
              This could indicate a man-in-the-middle attack, or the host may have been reconfigured.
            </Typography>
          ) : (
            <Typography variant="body2">
              The authenticity of host <strong>{fingerprint.host}:{fingerprint.port}</strong> can't be established.
            </Typography>
          )}
        </Alert>
        
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Host key fingerprint:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '120px' }}>
                      Host:
                    </TableCell>
                    <TableCell>
                      {fingerprint.host}:{fingerprint.port}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Key type:
                    </TableCell>
                    <TableCell>
                      {fingerprint.keyType}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Fingerprint:
                    </TableCell>
                    <TableCell>
                      <Box sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {fingerprint.hashAlgorithm.toUpperCase()}:{fingerprint.hash}
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {isChanged ? (
            "Please verify this fingerprint with the server administrator before continuing."
          ) : (
            "You should verify this fingerprint with the server administrator before continuing."
          )}
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MdSecurity color="success" size={20} />
          <Typography variant="body2" color="success.main">
            The fingerprint will be saved for future connections.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleReject} 
          color="error" 
          variant="outlined"
        >
          Reject
        </Button>
        <Button 
          onClick={handleVerify} 
          color="primary" 
          variant="contained"
          autoFocus
        >
          Accept and Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FingerprintVerifier; 