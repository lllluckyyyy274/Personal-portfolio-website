@echo off
chcp 65001 >nul
echo ========================================
echo   网站图片批量压缩工具
echo ========================================
echo.

REM 检查是否安装了必要工具
where magick >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 ImageMagick
    echo.
    echo 请先安装 ImageMagick:
    echo 1. 访问 https://imagemagick.org/script/download.php
    echo 2. 下载并安装 Windows 版本
    echo 3. 确保勾选"Install legacy utilities"选项
    echo.
    pause
    exit /b 1
)

echo [提示] 开始压缩图片...
echo [提示] 原始文件将保留，压缩后的文件保存在 compressed 文件夹
echo.

REM 创建输出目录
if not exist "compressed" mkdir compressed
if not exist "compressed\assets" mkdir compressed\assets

REM 复制目录结构
xcopy assets compressed\assets /E /I /Y >nul

echo [进度] 正在处理 PNG 图片...
echo.

REM 压缩PNG图片（质量80%）
for /r "compressed\assets" %%f in (*.png) do (
    echo   处理: %%~nxf
    magick "%%f" -quality 80 "%%f.tmp"
    move /y "%%f.tmp" "%%f" >nul
)

echo.
echo [进度] 正在处理 JPG/JPEG 图片...
echo.

REM 压缩JPG图片（质量85%）
for /r "compressed\assets" %%f in (*.jpg *.jpeg) do (
    echo   处理: %%~nxf
    magick "%%f" -quality 85 "%%f.tmp"
    move /y "%%f.tmp" "%%f" >nul
)

echo.
echo ========================================
echo   压缩完成！
echo ========================================
echo.
echo 压缩后的文件位于: compressed\assets 文件夹
echo.
echo [建议] 
echo 1. 检查压缩后的图片质量
echo 2. 如果满意，替换原 assets 文件夹
echo 3. 备份原文件以防需要恢复
echo.
echo 按任意键退出...
pause >nul
