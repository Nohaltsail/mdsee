@echo off
chcp 65001 >nul
setlocal

:: ============================================
::  mdsee - Windows 打包脚本
::  作者: Nohaltsail
:: ============================================

echo.
echo ============================================
echo   mdsee Windows 打包工具
echo ============================================
echo.

:: 切换到项目根目录（脚本所在目录）
cd /d "%~dp0"

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [信息] Node.js 版本:
node -v
echo [信息] npm 版本:
call npm -v
echo.

:: 设置 Electron 国内镜像（加速下载）
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

:: 指定本地 NSIS 安装路径（避免自动下载 NSIS 主程序）
set NSIS_DIR=D:\Program Files\NSIS\

:: 设置代理（用于下载 nsis-resources，如不需要可注释掉）
set HTTPS_PROXY=http://127.0.0.1:7890
set HTTP_PROXY=http://127.0.0.1:7890

:: 检查并下载 nsis-resources（如果缓存不存在）
set "NSIS_CACHE=%LOCALAPPDATA%\electron-builder\Cache\nsis\nsis-resources-3.4.1"
if not exist "%NSIS_CACHE%\Plugins\x86-unicode\UAC.dll" (
    echo [准备] 下载 nsis-resources-3.4.1...
    node -e "const{WebClient}=require('System.Net');throw 0" 2>nul || (
        powershell -NoProfile -Command ^
            "$proxy=New-Object System.Net.WebProxy('http://127.0.0.1:7890');" ^
            "$wc=New-Object System.Net.WebClient;" ^
            "$wc.Proxy=$proxy;" ^
            "$url='https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-resources-3.4.1/nsis-resources-3.4.1.7z';" ^
            "$out='%TEMP%\nsis-resources-3.4.1.7z';" ^
            "$wc.DownloadFile($url,$out);" ^
            "Write-Host 'Downloaded:' (Get-Item $out).Length 'bytes'"
    )

    if exist "%TEMP%\nsis-resources-3.4.1.7z" (
        echo [准备] 解压 nsis-resources...
        if exist "node_modules\7zip-bin\win\x64\7za.exe" (
            "node_modules\7zip-bin\win\x64\7za.exe" x "%TEMP%\nsis-resources-3.4.1.7z" -o"%NSIS_CACHE%" -y >nul
        ) else (
            echo [警告] 未找到 7za.exe，请先运行 npm install
        )
        del "%TEMP%\nsis-resources-3.4.1.7z" 2>nul
    )
)

if exist "%NSIS_CACHE%\Plugins\x86-unicode\UAC.dll" (
    echo [信息] nsis-resources 缓存已就绪
) else (
    echo [警告] nsis-resources 未准备好，打包可能失败
)
echo.

:: 安装依赖
if not exist "node_modules" (
    echo [步骤 1/3] 安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        echo.
        pause
        exit /b 1
    )
) else (
    echo [步骤 1/3] node_modules 已存在，跳过依赖安装
)
echo.

:: Vite 构建前端
echo [步骤 2/3] 构建前端资源...
call npx vite build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    echo.
    pause
    exit /b 1
)
echo.

:: electron-builder 打包
echo [步骤 3/3] 打包 Windows 安装程序 (NSIS)...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo [错误] 打包失败
    echo.
    pause
    exit /b 1
)
echo.

:: 输出结果
echo ============================================
echo   打包成功！
echo   产物目录: release\
echo ============================================
echo.

:: 列出产物文件
echo 生成的文件:
dir /b "release\*.exe" 2>nul
echo.

pause
