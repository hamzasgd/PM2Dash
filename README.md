# PM2Dash

A cross-platform GUI for monitoring and managing PM2 processes with SSH support.

![PM2Dash Screenshot](https://raw.githubusercontent.com/hamzasgd/PM2Dash/main/screenshot.png)

## Features

- 📊 **Monitor PM2 Processes**: View real-time stats for all your PM2 processes including CPU, memory usage, and uptime
- 🔄 **Process Management**: Start, stop, restart, and delete processes with a single click
- 📱 **Responsive Design**: Modern, intuitive interface that works on desktop and adjusts for different screen sizes
- 🔌 **SSH Support**: Connect and manage PM2 processes on remote servers via SSH
- 📝 **Log Viewing**: View and search through process logs in real-time
- 🔐 **Secure**: Your SSH credentials are stored locally and securely
- 🌐 **Cross-Platform**: Available for Windows and Linux

## Installation

### Linux

#### AppImage (recommended)
1. Download the AppImage parts from the [Releases](https://github.com/hamzasgd/PM2Dash/releases) page
2. Combine the parts using: `cat PM2Dash-1.0.0.AppImage.part-* > PM2Dash-1.0.0.AppImage`
3. Make it executable: `chmod +x PM2Dash-1.0.0.AppImage`
4. Run the application: `./PM2Dash-1.0.0.AppImage`

#### Debian Package
1. Download the Debian package parts from the [Releases](https://github.com/hamzasgd/PM2Dash/releases) page
2. Combine the parts using: `cat pm2-gui_1.0.0_amd64.deb.part-* > pm2-gui_1.0.0_amd64.deb`
3. Install the package: `sudo dpkg -i pm2-gui_1.0.0_amd64.deb`
4. Run the application: `pm2dash`

### Windows

1. Download the Windows ZIP parts from the [Releases](https://github.com/hamzasgd/PM2Dash/releases) page
2. Open PowerShell in the download directory and run:
   ```powershell
   Get-ChildItem -Filter PM2Dash-1.0.0-win32-x64.zip.part-* | Sort-Object Name | ForEach-Object { Get-Content $_ -Raw -Encoding Byte } | Set-Content -Path PM2Dash-1.0.0-win32-x64.zip -Encoding Byte
   ```
3. Extract the ZIP file
4. Run `PM2Dash.exe` from the extracted folder

## Usage

1. Launch the application
2. For local connections:
   - Click "Connect to Local PM2"
3. For remote connections:
   - Click "Add SSH Connection"
   - Enter your server details and SSH credentials
   - Connect to your server

## Requirements

- For local usage: PM2 must be installed (`npm install -g pm2`)
- For remote usage: PM2 must be installed on the remote server

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/hamzasgd/PM2Dash.git
cd PM2Dash

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building
```bash
# Build for all platforms
npm run build

# Build for specific platform
npm run build:linux
npm run build:windows
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/hamzasgd/PM2Dash/issues) on GitHub.
