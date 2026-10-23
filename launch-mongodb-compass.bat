@echo off
echo ========================================================
echo Launching MongoDB Compass
echo ========================================================
if exist "%LOCALAPPDATA%\Programs\MongoDB Compass\MongoDBCompass.exe" (
    echo Starting MongoDB Compass...
    start "" "%LOCALAPPDATA%\Programs\MongoDB Compass\MongoDBCompass.exe"
) else if exist "%USERPROFILE%\Downloads\mongodb-compass-setup.exe" (
    echo Running MongoDB Compass setup...
    start "" "%USERPROFILE%\Downloads\mongodb-compass-setup.exe"
) else (
    echo MongoDB Compass not found.
    echo Please visit https://www.mongodb.com/products/compass
)
