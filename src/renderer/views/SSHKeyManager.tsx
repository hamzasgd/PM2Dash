import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Divider,
  Paper,
  Tooltip,
  useTheme,
  FormControl,
  FormLabel,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { 
  MdAdd, 
  MdSave, 
  MdDelete,
  MdKey,
  MdRefresh,
  MdContentCopy
} from 'react-icons/md';
import { SSHKey } from '../types';
import PageContainer from '../components/PageContainer';

const SSHKeyManager: React.FC = () => {
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyContent, setNewKeyContent] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<SSHKey | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    title: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    title: '',
    severity: 'info'
  });
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Load saved SSH keys
  useEffect(() => {
    const loadSavedKeys = async () => {
      try {
        const result = await window.api.getSSHKeys();
        if (result.success && result.keys) {
          setKeys(result.keys.map((key: SSHKey) => ({
            ...key,
            createdAt: new Date(key.createdAt)
          })));
        }
      } catch (error) {
        console.error('Failed to load saved SSH keys:', error);
        showToast('Error', 'Failed to load SSH keys', 'error');
      }
    };

    loadSavedKeys();
  }, []);

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const showToast = (title: string, message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({
      open: true,
      title,
      message,
      severity
    });
  };

  const handleAddKey = async () => {
    try {
      if (!newKeyName.trim()) {
        showToast('Error', 'Please provide a name for the key', 'error');
        return;
      }

      if (!newKeyContent.trim()) {
        showToast('Error', 'Please provide the key content', 'error');
        return;
      }

      // Check if a key with this name already exists
      const nameExists = keys.some(key => key.name.toLowerCase() === newKeyName.trim().toLowerCase());
      if (nameExists) {
        showToast('Error', 'A key with this name already exists', 'error');
        return;
      }

      const newKey = {
        id: Date.now().toString(),
        name: newKeyName.trim(),
        content: newKeyContent,
        createdAt: new Date()
      };

      console.log('Attempting to save key:', { ...newKey, content: '***' });
      
      try {
        const result = await window.api.saveSSHKey(newKey);
        console.log('Save key result:', result);
        
        if (result && result.success) {
          setKeys([...keys, newKey]);
          setNewKeyName('');
          setNewKeyContent('');
          setIsAddDialogOpen(false);
          showToast('Success', 'SSH key saved successfully', 'success');
        } else {
          console.error('Failed result from saveSSHKey:', result);
          showToast('Error', result.error || 'Failed to save SSH key', 'error');
        }
      } catch (innerError) {
        console.error('Inner try-catch - Error saving SSH key:', innerError);
        showToast('Error', 'Error in API call: ' + (innerError instanceof Error ? innerError.message : String(innerError)), 'error');
      }
    } catch (error) {
      console.error('Outer try-catch - Error saving SSH key:', error);
      showToast('Error', 'An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const result = await window.api.deleteSSHKey(id);
      
      if (result.success) {
        setKeys(keys.filter(key => key.id !== id));
        showToast('Success', 'SSH key deleted successfully', 'success');
      } else {
        showToast('Error', 'Failed to delete SSH key', 'error');
      }
    } catch (error) {
      console.error('Error deleting SSH key:', error);
      showToast('Error', 'An unexpected error occurred', 'error');
    }
  };

  const handleViewKey = async (key: SSHKey) => {
    try {
      // Just use the provided key directly without trying to fetch it again
      setSelectedKey(key);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error displaying SSH key:', error);
      showToast('Error', 'Failed to display key content', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied', 'Copied to clipboard', 'success');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Error', 'Failed to copy to clipboard', 'error');
      });
  };

  const refreshKeys = async () => {
    try {
      const result = await window.api.getSSHKeys();
      if (result.success && result.keys) {
        setKeys(result.keys.map((key: SSHKey) => ({
          ...key,
          createdAt: new Date(key.createdAt)
        })));
        showToast('Success', 'SSH keys refreshed', 'success');
      } else {
        showToast('Error', 'Failed to refresh SSH keys', 'error');
      }
    } catch (error) {
      console.error('Failed to refresh SSH keys:', error);
      showToast('Error', 'Failed to refresh SSH keys', 'error');
    }
  };

  return (
    <PageContainer
      title="SSH Key Manager"
      description="Manage your SSH keys for server authentication"
      actions={
        <Button 
          variant="contained" 
          startIcon={<MdAdd />}
          onClick={() => setIsAddDialogOpen(true)}
          sx={{
            fontFamily: '"SF Mono", monospace',
          }}
        >
          Add New Key
        </Button>
      }
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          <AlertTitle>{snackbar.title}</AlertTitle>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ p: 3 }}>
        {keys.length === 0 ? (
          <Box sx={{ my: 2 }}>
            <Alert severity="info">
              <AlertTitle>No SSH Keys Found</AlertTitle>
              <Typography>Add an SSH key by clicking the "Add New Key" button.</Typography>
              <Button 
                size="small" 
                startIcon={<MdRefresh />} 
                onClick={refreshKeys} 
                sx={{ mt: 2 }}
              >
                Refresh Keys
              </Button>
            </Alert>
          </Box>
        ) : (
          <Box>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                size="small" 
                startIcon={<MdRefresh />} 
                onClick={refreshKeys}
                variant="outlined"
              >
                Refresh Keys
              </Button>
            </Box>
            <Grid container spacing={3}>
              {keys.map((key) => (
                <Grid item xs={12} md={6} key={key.id}>
                  <Card 
                    sx={{ 
                      transition: "transform 0.2s", 
                      "&:hover": { transform: "translateY(-4px)" },
                      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : '#ffffff',
                      border: `1px solid ${isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`
                    }}
                  >
                    <CardHeader 
                      title={key.name}
                      subheader={`Added: ${key.createdAt.toLocaleDateString()}`}
                      avatar={<MdKey fontSize="large" />}
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        SSH key is securely stored. Click "View Key" to see the content.
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        onClick={() => handleViewKey(key)}
                        variant="outlined"
                      >
                        View Key
                      </Button>
                      <Button
                        size="small"
                        startIcon={<MdDelete />}
                        color="error"
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Add Key Dialog */}
        <Dialog 
          open={isAddDialogOpen} 
          onClose={() => setIsAddDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Add New SSH Key</DialogTitle>
          <DialogContent>
            <Box sx={{ p: 1 }}>
              <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
                <FormLabel>Key Name</FormLabel>
                <TextField
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="My Server Key"
                  fullWidth
                  size="small"
                />
                <FormHelperText>A name to identify this key</FormHelperText>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Key Content</FormLabel>
                <TextField
                  value={newKeyContent}
                  onChange={(e) => setNewKeyContent(e.target.value)}
                  placeholder="Paste your private key content here"
                  fullWidth
                  multiline
                  rows={10}
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
                <FormHelperText>Paste the entire private key including headers</FormHelperText>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddKey} 
              variant="contained" 
              disabled={!newKeyName.trim() || !newKeyContent.trim()}
            >
              Save Key
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Key Dialog */}
        <Dialog 
          open={isViewDialogOpen} 
          onClose={() => setIsViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>View SSH Key: {selectedKey?.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ p: 1 }}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 2, 
                  backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.6)' : theme.palette.grey[100],
                  maxHeight: '300px', 
                  overflow: 'auto' 
                }}
              >
                {selectedKey?.content ? (
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ 
                      fontFamily: 'monospace', 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}
                  >
                    {selectedKey.content}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No key content available
                  </Typography>
                )}
              </Paper>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  startIcon={<MdContentCopy />}
                  onClick={() => selectedKey?.content && copyToClipboard(selectedKey.content)}
                  size="small"
                  disabled={!selectedKey?.content}
                >
                  Copy to Clipboard
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default SSHKeyManager; 