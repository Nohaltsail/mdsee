@echo off
chcp 65001 >nul
echo ========================================
echo   Kill processes on port 5173
echo ========================================
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Killing PID: %%a
    taskkill /F /PID %%a
)

echo.
echo Done! You can now run: npm run electron:dev
pause
