# PM2 Manager GUI

A cross-platform desktop application for managing PM2 processes with SSH support, built with Electron, React, TypeScript, and Material UI.

## Features

- Connect to remote servers via SSH
- Manage PM2 processes (view, start, stop, restart, delete)
- View process logs with filtering
- Dark/Light mode theme switching
- Persistent settings and saved connections

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/pm2-gui.git
   cd pm2-gui
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm start
   ```

## Project Structure

```
src/
├── main/              # Electron main process
├── renderer/          # React renderer process
│   ├── components/    # Reusable UI components
│   ├── views/         # Page components
│   ├── services/      # Business logic services
│   ├── App.tsx        # Main app component
│   └── theme.ts       # Material UI theme configuration
├── preload/           # Preload script for secure API
└── shared/            # Shared types and utilities
```

## UI Component Library

This project uses Material UI for its component library. Here are some key resources:

- [Material UI Documentation](https://mui.com/material-ui/)
- [Component API Reference](https://mui.com/material-ui/api/)
- [Styling Solutions](https://mui.com/material-ui/customization/how-to-customize/)

## Working with the Theme

The app includes a custom Material UI theme with both light and dark modes:

```tsx
// Using the theme in components
import { useTheme } from '@mui/material';

const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary
    }}>
      Content
    </Box>
  );
};
```

## Toggling Dark Mode

The app includes a theme context that allows toggling between light and dark modes:

```tsx
import { useContext } from 'react';
import { ColorModeContext } from '../App';

const ThemeToggle = () => {
  const colorMode = useContext(ColorModeContext);
  
  return (
    <Button onClick={colorMode.toggleColorMode}>
      Toggle {colorMode.mode === 'light' ? 'Dark' : 'Light'} Mode
    </Button>
  );
};
```

## Building for Production

To build the application for production:

```
npm run build
```

This will create distributable packages for your current platform in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details. # PM2Dash
