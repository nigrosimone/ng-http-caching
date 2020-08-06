@echo off
copy /y "%cd%\README.md" "%cd%\dist\ng-http-caching\README.md"
copy /y "%cd%\LICENSE" "%cd%\dist\ng-http-caching\LICENSE"
npm run build ng-http-caching --prod && cd dist/ng-http-caching && npm publish --ignore-scripts
pause