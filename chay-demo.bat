@echo off
chcp 65001 >nul
echo Dang mo API va Web, doi khoang 30 giay...
start "API - QuanLyDocTruyen" cmd /k "cd /d %~dp0backend\QuanLyDocTruyen.API && dotnet run"
start "Web - QuanLyDocTruyen" cmd /k "cd /d %~dp0web && npm install && npm run dev"
timeout /t 30 /nobreak >nul
start "" http://localhost:5173
