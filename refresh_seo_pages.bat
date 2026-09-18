@echo off
setlocal
cd /d "%~dp0"

echo.
echo Generating product SEO pages...
python generate_product_pages.py
if errorlevel 1 (
    echo.
    echo SEO product page generation failed.
    pause
    exit /b 1
)

echo.
echo Generating category SEO pages...
python generate_category_pages.py
if errorlevel 1 (
    echo.
    echo SEO category page generation failed.
    pause
    exit /b 1
)

echo.
echo Product and category SEO pages refreshed successfully.
pause
