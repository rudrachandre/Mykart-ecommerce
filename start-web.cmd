@echo off
setlocal
rem %~dp0 = this script's folder (trailing backslash, quote-safe with spaces)
cd /d "%~dp0apps\web"
"C:\Program Files\nodejs\node.exe" "%~dp0node_modules\next\dist\bin\next" start -p 3000
