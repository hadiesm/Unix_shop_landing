@echo off

setlocal

cd /d "%~dp0"

echo.
echo Generating category SEO pages...

python generate_category_pages.py

if errorlevel 1 (
    echo.
    echo Category SEO page generation failed.
    pause
    exit /b 1
)

echo.
echo Generating sitemap...

python generate_sitemap.py

if errorlevel 1 (
    echo.
    echo Sitemap generation failed.
    pause
    exit /b 1
)

echo.
echo Category SEO pages and sitemap refreshed successfully.

pause