@echo off
echo Loading environment variables from .dev.vars...
for /f "usebackq tokens=1,* delims==" %%a in (".dev.vars") do (
    set "%%a=%%~b"
)

echo Running register command...
call npm run register

echo.
pause
