@echo off
echo ========================================
echo   Babylon.js Game Engine - Server Startup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo Node.js and Python are available
echo.

REM Get current directory
set ROOT_DIR=%cd%

REM Check if npm dependencies are installed in root
if not exist "node_modules" (
    echo Installing npm dependencies in root directory...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install npm dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Check if Python dependencies are installed
echo Checking Python dependencies...
cd "%ROOT_DIR%\babylon-server"
pip install flask flask-cors flask-sqlalchemy >nul 2>&1
cd "%ROOT_DIR%"
echo.

echo Starting servers...
echo.

REM Start Flask server in a new window from babylon-server folder
echo Starting Flask API Server (Port 5001)...
start "Babylon.js - Flask API Server" cmd /k "cd /d "%ROOT_DIR%\babylon-server" && python src/main.py"

REM Wait a moment for Flask to start
timeout /t 3 /nobreak >nul

REM Start Vite development server in a new window from root folder
echo Starting Vite Development Server (Port 3000)...
start "Babylon.js - Vite Dev Server" cmd /k "cd /d "%ROOT_DIR%" && npm run dev"

REM Wait a moment for Vite to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Servers Started Successfully!
echo ========================================
echo.
echo Flask API Server: http://localhost:5001
echo Vite Dev Server:  http://localhost:3000
echo.
echo The application should open automatically in your browser.
echo If not, navigate to: http://localhost:3000
echo.
echo To stop the servers, close both command windows.
echo.

REM Try to open the application in the default browser
start http://localhost:3000

echo Press any key to exit this window...
pause >nul

