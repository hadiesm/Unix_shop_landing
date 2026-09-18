@echo off
setlocal
cd /d "%~dp0"
python generate_product_pages.py
if errorlevel 1 (
    echo.
    echo SEO product page generation failed.
    pause
    exit /b 1
)
echo.
echo SEO product pages refreshed successfully.
pause
