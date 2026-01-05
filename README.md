# YT Downloader

Electron-based YouTube downloader using `yt-dlp` and `ffmpeg`.

## Features

- Download audio only (MP3)
- Download video only (no audio)
- Download video + audio (merged with best quality)
- Quality selection: Best, High (≤1080p), Medium (≤720p), Low (≤480p)
- Remembers output folder for next time

## Setup

### Development

```bash
npm install
npm run electron:dev
```

### Build for Windows

```bash
npm run electron:build:win
```

The installer will be in `dist-electron/` folder.

## Binary Files

The app uses bundled binaries:
- `electron/bin/yt-dlp.exe` - YouTube downloader
- `electron/bin/ffmpeg.exe` - Audio/video processing

Make sure both files are placed in `electron/bin/` before building. They will be automatically included in the packaged app.

## Notes

- The app saves your output folder preference in config file.
- All npm dependencies are bundled in the installer - users don't need to install anything extra.
