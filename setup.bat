@echo off
setlocal

echo ========================================================
echo AO-SplitNBalenceBot Setup Wizard
echo ========================================================
echo.

set /p DISCORD_TOKEN="Enter your Discord Bot Token: "
set /p DISCORD_APPLICATION_ID="Enter your Discord Application ID: "
set /p DISCORD_PUBLIC_KEY="Enter your Discord Public Key: "

echo.
echo Saving credentials to .dev.vars for local testing...

(
echo DISCORD_TOKEN="%DISCORD_TOKEN%"
echo DISCORD_APPLICATION_ID="%DISCORD_APPLICATION_ID%"
echo DISCORD_PUBLIC_KEY="%DISCORD_PUBLIC_KEY%"
) > .dev.vars

echo.
echo Installing dependencies (if needed)...
call npm install

echo.
echo Registering Discord slash commands...
node scripts/register-commands.js

echo.
echo ========================================================
echo Setup Complete!
echo.
echo 1. You can now test the bot locally by running:
echo    npm run dev
echo.
echo 2. When you are ready to deploy to production, run:
echo    npm run deploy
echo.
echo    (Note: For production, you will also need to add your 
echo     secrets to Cloudflare by running the following commands:)
echo.
echo    wrangler secret put DISCORD_TOKEN
echo    wrangler secret put DISCORD_APPLICATION_ID
echo    wrangler secret put DISCORD_PUBLIC_KEY
echo.
echo ========================================================
echo Bot Invite Link:
echo https://discord.com/oauth2/authorize?client_id=%DISCORD_APPLICATION_ID%^&permissions=8^&integration_type=0^&scope=bot+applications.commands
echo ========================================================
echo.
pause
