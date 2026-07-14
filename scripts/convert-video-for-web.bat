@echo off
REM Convert any video to web-playable MP4 (H.264 + AAC, max 1080p)
REM Usage: convert-video-for-web.bat "C:\path\to\video.mov"
REM Output: same folder, name-web.mp4  — upload THAT file to Media Manager

setlocal
set "IN=%~1"
if "%IN%"=="" (
  echo Drag a video onto this bat, or:
  echo   convert-video-for-web.bat "C:\Videos\clip.mp4"
  pause
  exit /b 1
)
if not exist "%IN%" (
  echo File not found: %IN%
  pause
  exit /b 1
)

where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo ffmpeg not found. Install ffmpeg and add it to PATH.
  pause
  exit /b 1
)

set "OUT=%~dpn1-web.mp4"
echo Input : %IN%
echo Output: %OUT%
echo Converting to H.264 1080p for Chrome/phone browsers...

REM H.264 8-bit (yuv420p) + AAC — required for Chrome/Android (HEVC/10-bit = audio only)
ffmpeg -y -i "%IN%" -map 0:v:0 -map 0:a:0? ^
  -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset medium -crf 22 ^
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,format=yuv420p" ^
  -c:a aac -b:a 192k -ac 2 ^
  -movflags +faststart ^
  "%OUT%"

if errorlevel 1 (
  echo Convert failed.
  pause
  exit /b 1
)

echo.
echo Done. Upload this file to Media Manager:
echo   %OUT%
echo.
pause
