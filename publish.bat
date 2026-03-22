@echo off
setlocal

:: 1. Use %~dp0 to reliably get the directory where the .bat file lives
set "ROOT_DIR=%~dp0"

echo Checking npm authentication...
call npm whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo You are not logged in. Prompting for npm login...
    call npm login || exit /b
)

echo Bumping root version...
call npm version patch || exit /b

echo Bumping library version...
:: 2. Use pushd/popd for safe directory switching
pushd "%ROOT_DIR%projects\ng-http-caching" || exit /b
call npm version patch || exit /b
popd

echo Building library...
:: 3. Use 'call' for npm commands to prevent the script from exiting early
call npm run build ng-http-caching || exit /b

echo Copying metadata files...
copy /y "%ROOT_DIR%README.md" "%ROOT_DIR%dist\ng-http-caching\README.md" > nul || exit /b
copy /y "%ROOT_DIR%LICENSE" "%ROOT_DIR%dist\ng-http-caching\LICENSE" > nul || exit /b

echo Publishing library...
pushd "%ROOT_DIR%dist\ng-http-caching" || exit /b
call npm publish --ignore-scripts || exit /b
popd

echo Publish complete!
pause