@echo off
title Job Hunter — First-time Setup
cd /d "%~dp0"

echo.
echo ============================================
echo   JOB HUNTER — Installing dependencies
echo ============================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please download it from https://nodejs.org and install it first.
  echo.
  pause
  exit /b 1
)

echo [OK] Node.js found:
node --version

echo.
echo Installing npm packages (this includes Chromium and may take a few minutes)...
echo.
npm install

if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Setup complete!
echo   Double-click run.bat every day to hunt.
echo ============================================
echo.
pause
