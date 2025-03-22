# Migration Plan: Chakra UI to Material UI

## Overview
This document outlines the plan to migrate the PM2 Manager GUI application from Chakra UI to Material UI. This is a significant change that affects all UI components in the application.

## Completed Changes
- [x] Installed Material UI packages
- [x] Updated App.tsx to use ThemeProvider from Material UI
- [x] Migrated Dashboard.tsx component
- [x] Started migration of Sidebar.tsx component

## Remaining Tasks

### 1. Complete Core Components Migration
- [ ] Finish Sidebar.tsx migration
- [ ] Create reusable components that match our application needs:
  - [ ] Create a PageContainer component
  - [ ] Create a ConnectionForm component
  - [ ] Create a StatusBadge component

### 2. Migrate View Components
- [ ] ConnectionManager.tsx
- [ ] ProcessManager.tsx
- [ ] Logs.tsx
- [ ] Settings.tsx

### 3. Theme Configuration
- [ ] Set up light/dark mode theme switching
- [ ] Configure theme colors to match our application's design

### 4. Testing
- [ ] Test all components in development mode
- [ ] Test build process
- [ ] Test application functionality

## Migration Patterns
When migrating components, follow these patterns:

### Component Mapping
| Chakra UI | Material UI |
|-----------|-------------|
| Box | Box |
| Flex | Stack, Box with display="flex" |
| Stack, VStack, HStack | Stack (direction="column" or "row") |
| Button | Button |
| Heading | Typography variant="h1"-"h6" |
| Text | Typography |
| Input | TextField |
| InputGroup | TextField with InputAdornment |
| FormControl | FormControl |
| FormLabel | InputLabel |
| Card | Card, CardContent |
| Divider | Divider |
| Alert | Alert, AlertTitle |
| useColorMode | useTheme, createTheme |
| Icon | Icon or direct import from react-icons |

### Styling Approach
Material UI uses a different styling approach:
- Replace Chakra's prop-based styling (p={4}, mt={2}, etc.) with Material UI's sx prop
- Example: `<Box p={4} mt={2}>` becomes `<Box sx={{ p: 4, mt: 2 }}>`
- For theme colors, use the theme object: `color="primary.main"` instead of `colorScheme="blue"`

### Event Handling
- Add proper TypeScript types for event handlers
- Use event.target.value instead of direct access

## Resources
- [Material UI Documentation](https://mui.com/material-ui/getting-started/)
- [Migration Guide from other libraries](https://mui.com/material-ui/guides/migration-v4/)
- [Material UI Components API](https://mui.com/material-ui/api/) 