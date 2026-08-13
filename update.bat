@echo off
setlocal

echo ========================================================
echo AO-SplitNBalenceBot Update Wizard
echo ========================================================
echo.

echo Pulling latest changes from GitHub...
git pull

echo.
echo Installing updated dependencies...
call npm install

echo.
echo Registering updated Discord slash commands...
node scripts/register-commands.js

echo.
echo ========================================================
echo Database Migrations
echo ========================================================
echo.
set /p DO_MIGRATE="Would you like to apply database schema migrations? (Y/N): "
if /I "%DO_MIGRATE%"=="Y" (
    echo.
    echo Applying migrations to LOCAL development database...
    call npx wrangler d1 migrations apply albion-balances --local
    echo.
    echo Applying migrations to REMOTE production database...
    call npx wrangler d1 migrations apply albion-balances --remote
) else (
    echo.
    echo Skipping database migrations.
)

echo.
echo ========================================================
echo Update Complete!
echo.
echo To test the update locally, run:
echo    npm run dev
echo.
echo To deploy the updated bot to production, run:
echo    npm run deploy
echo ========================================================
echo.
pause
