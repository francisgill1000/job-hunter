@echo off
title Job Hunter — Daily Run
cd /d "%~dp0"

echo.
echo ============================================
echo   JOB HUNTER — Starting daily search...
echo ============================================
echo.

REM Auto-install if node_modules is missing
if not exist node_modules (
  echo [!] node_modules not found. Running install first...
  echo.
  npm install
  if errorlevel 1 (
    echo [ERROR] Install failed. Run install.bat manually.
    pause
    exit /b 1
  )
)

REM Run the hunter
node src/index.js

if errorlevel 1 (
  echo.
  echo [ERROR] Job hunter exited with an error. Skipping git push.
  pause
  exit /b 1
)

REM ── Push report to git so Netlify auto-deploys ──────────────────
echo.
echo ============================================
echo   Pushing report to git...
echo ============================================
echo.

git add output/index.html output/

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set TODAY=%%c-%%a-%%b)
git commit -m "Job hunt results - %TODAY%"

if errorlevel 1 (
  echo [!] Nothing new to commit, or commit failed.
) else (
  git push
  if errorlevel 1 (
    echo [ERROR] git push failed. Check your remote/auth settings.
  ) else (
    echo [OK] Report pushed. Netlify will deploy in ~30 seconds.
  )
)

echo.
echo [DONE] All done! Your report is live on Netlify.
echo.
pause
