@echo off
chcp 65001 >nul
cd /d "%~dp0"
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
echo ========================================
echo   mdsee - Markdown Desktop Editor
echo ========================================
echo.
echo Please select run mode:
echo   1. Development Mode (with hot reload)
echo   2. Production Preview (need build first)
echo.
choice /C 12 /M "Select" /N
if errorlevel 2 goto preview
if errorlevel 1 goto dev

:dev
echo.
echo [Development] Starting...
npm run electron:dev
goto end

:preview
echo.
echo [Production Preview] Checking build...
if not exist "dist\index.html" (
    echo Build files not found, building now...
    call npm run build
)
echo [Production Preview] Starting...
npm run electron:preview
goto end

:end
pause
