# YT Downloader

Short notes:

-   App: Electron + React (Vite). Download audio/video from YouTube using `yt-dlp` + `ffmpeg`.

-   New feature: **Chọn định dạng xuất (container)** — in the UI you can now choose: **Giữ định dạng gốc**, **MP4**, **MKV**, **WEBM**. If you pick a container other than "Giữ định dạng gốc", the app uses `--recode-video` (requires `ffmpeg`).

-   If you don't have ffmpegdownload and extract `ffmpeg.exe` into `electron/bin` or install ffmpeg on PATH. (The automatic download script has been removed.)H.

-   Notes for packaging: make sure `yt-dlp` and `ffmpeg.exe` (if desired) are placed in `electron/bin` so they get included in the packaged app.
