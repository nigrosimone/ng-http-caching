@echo off
npm run build ng-http-caching --prod && copy /y "%cd%\README.md" "%cd%\dist\ng-http-caching\README.md" && copy /y "%cd%\LICENSE" "%cd%\dist\ng-http-caching\LICENSE" && cd dist/ng-http-caching && npm publish --ignore-scripts
pause