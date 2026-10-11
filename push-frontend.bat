@echo off
title Push LUMA Frontend to GitHub
cls
echo ===================================================
echo     LUMA Frontend - Automated GitHub Push Script
echo     Target: https://github.com/Harichandana27/luma-frontend
echo ===================================================
echo.

set GH_USER=Harichandana27

echo Initializing git repository...
git init

echo Configuring Git author identity...
git config user.name "Harichandana27"
git config user.email "harichandana27@users.noreply.github.com"

echo Adding files...
git add -A
git commit -m "LUMA Frontend - Production UI & Enterprise Vault Client"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/%GH_USER%/luma-frontend.git

echo.
echo Pushing files to https://github.com/%GH_USER%/luma-frontend.git ...
echo (If a GitHub sign-in prompt appears, click 'Sign in with browser')
echo.
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ===================================================
    echo [SUCCESS] Frontend pushed to GitHub successfully!
    echo Your Frontend Link: https://github.com/%GH_USER%/luma-frontend
    echo ===================================================
) else (
    echo ===================================================
    echo If push failed, make sure:
    echo 1. You created the repository 'luma-frontend' on github.com
    echo 2. You clicked 'Authorize' or signed in when prompted
    echo ===================================================
)
echo.
pause
