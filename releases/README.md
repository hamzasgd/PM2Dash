# PM2Dash Release Files

Due to GitHub's file size limitations (25MB per file), the release files have been split into multiple parts.

## Reassembly Instructions

### Linux (Ubuntu/Debian)

To reassemble the files, use the `cat` command:

#### For AppImage:
```bash
cat PM2Dash-1.0.0.AppImage.part-* > PM2Dash-1.0.0.AppImage
chmod +x PM2Dash-1.0.0.AppImage
```

#### For Debian package:
```bash
cat pm2-gui_1.0.0_amd64.deb.part-* > pm2-gui_1.0.0_amd64.deb
sudo dpkg -i pm2-gui_1.0.0_amd64.deb
```

### Windows

#### For Windows zip:
First, download all the parts, then using PowerShell:
```powershell
Get-ChildItem -Path "PM2Dash-1.0.0-win32-x64.zip.part-*" | Sort-Object -Property Name | ForEach-Object { Get-Content -Path $_.FullName -Raw -Encoding Byte } | Set-Content -Path "PM2Dash-1.0.0-win32-x64.zip" -Encoding Byte
```

Or, using [7-Zip](https://www.7-zip.org/):
1. Download all parts
2. Select all parts
3. Right-click and choose "Combine files..."
4. Specify the output filename as "PM2Dash-1.0.0-win32-x64.zip"

After reassembly, extract the zip file and run `electron.exe` from the extracted folder.

## Running Instructions

### Linux AppImage
```bash
./PM2Dash-1.0.0.AppImage --no-sandbox
```

### Debian Package
After installation with dpkg, run from your applications menu or with:
```bash
pm2-gui
```

### Windows
Extract the zip file and run `electron.exe` from the extracted folder. 