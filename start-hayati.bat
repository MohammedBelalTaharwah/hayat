@echo off
cd /d "%~dp0"
echo ========================================
echo   Hayati | حياتي - Personal Organizer
echo ========================================
echo.

:: Start server with pm2
echo [1/3] Starting Hayati server...
pm2 start server.js --name hayati --silent 2>nul
if %ERRORLEVEL% neq 0 pm2 start server.js --name hayati
echo   Hayati running at: http://localhost:3000
echo.

:: Check ngrok token
echo [2/3] Checking ngrok...
ngrok config check 2>nul | find "authtoken" >nul
if %ERRORLEVEL% neq 0 (
    echo   ! ngrok needs authentication.
    echo   Sign up free at https://ngrok.com  (no credit card)
    echo   Then paste your token below:
    set /p NGROK_TOKEN="Enter ngrok auth token: "
    ngrok config add-authtoken %NGROK_TOKEN%
)

:: Start ngrok
echo [3/3] Starting ngrok tunnel...
echo   Public URL will appear in the ngrok window.
echo   Press Ctrl+C on the ngrok window to stop it.
echo.
start "ngrok" ngrok http 3000
echo.
echo ========================================
echo   Local:     http://localhost:3000
echo   Share via: (see ngrok window for URL)
echo   Admin:     http://localhost:3000/admin/
echo ========================================
echo.
echo Commands:
echo   pm2 status           - Check if server is running
echo   pm2 stop hayati      - Stop the server
echo   pm2 restart hayati   - Restart the server
echo   pm2 logs hayati      - View server logs
echo.
pause
