@echo off
echo ========================================
echo   Babylon.js Game Engine - Stop Servers
echo ========================================
echo.

echo Stopping all Node.js processes (Vite)...
taskkill /f /im node.exe >nul 2>&1

echo Stopping all Python processes (Flask)...
taskkill /f /im python.exe >nul 2>&1

echo.
echo ========================================
echo   All Servers Stopped!
echo ========================================
echo.
echo Press any key to exit...
pause >nul

