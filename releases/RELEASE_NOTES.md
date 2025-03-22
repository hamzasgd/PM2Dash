# PM2Dash v1.0.0 Release

Cross-platform PM2 process manager GUI with SSH support

## Features
- Monitor and manage PM2 processes
- Remote management through SSH
- Process logs viewing and monitoring
- Process resource usage statistics
- SSH key fingerprint verification
- Clean, modern user interface

## Downloads
Due to GitHub's file size limitations (25MB per file), the release files have been split into multiple parts. Please download all parts and follow the README.md instructions to reassemble them.

### Split Files
- **Linux AppImage**: Download all `PM2Dash-1.0.0.AppImage.part-*` files
- **Linux Debian Package**: Download all `pm2-gui_1.0.0_amd64.deb.part-*` files
- **Windows Portable**: Download all `PM2Dash-1.0.0-win32-x64.zip.part-*` files

### Convenience Files
- **Linux Launcher Scripts**: Download `pm2dash` and `run-pm2dash.sh` and place them next to your reconstructed AppImage

## Installation Instructions

### Linux AppImage
1. Download all AppImage part files
2. Reassemble: `cat PM2Dash-1.0.0.AppImage.part-* > PM2Dash-1.0.0.AppImage`
3. Make it executable: `chmod +x PM2Dash-1.0.0.AppImage`
4. Run it: `./PM2Dash-1.0.0.AppImage --no-sandbox`

### Linux Debian Package
1. Download all .deb part files
2. Reassemble: `cat pm2-gui_1.0.0_amd64.deb.part-* > pm2-gui_1.0.0_amd64.deb`
3. Install it: `sudo dpkg -i pm2-gui_1.0.0_amd64.deb`
4. Run from your applications menu or with: `pm2-gui`

### Windows
1. Download all zip part files
2. Reassemble using PowerShell:
   ```powershell
   Get-ChildItem -Path "PM2Dash-1.0.0-win32-x64.zip.part-*" | Sort-Object -Property Name | ForEach-Object { Get-Content -Path $_.FullName -Raw -Encoding Byte } | Set-Content -Path "PM2Dash-1.0.0-win32-x64.zip" -Encoding Byte
   ```
3. Extract the ZIP file
4. Run electron.exe inside the extracted folder

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Data Storage Location
- Linux: `~/.config/pm2-gui/`
- Windows: `%APPDATA%\pm2-gui\` 