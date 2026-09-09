@echo off
rem SEC-K Portali - yonetim komutlarini dogru Node ile calistirir.
rem
rem Pakette node.exe geldigi icin sunucuya Node.js kurmak gerekmiyor. Bu
rem sarmalayici once paketteki node.exe'yi kullanir, yoksa sistemdeki
rem node komutuna duser.
rem
rem Kullanim (paket klasorunde):
rem   nodejs.cmd komutlar\seed.cjs
rem   nodejs.cmd komutlar\sifre.cjs --liste
rem   nodejs.cmd komutlar\demo.cjs
rem   nodejs.cmd baslat.cjs

setlocal
if exist "%~dp0node\node.exe" (
    "%~dp0node\node.exe" %*
) else (
    where node >nul 2>nul
    if errorlevel 1 (
        echo.
        echo   Node.js bulunamadi ve pakette node\node.exe yok.
        echo   Arsivi yeniden acin veya Node.js 20 LTS kurun.
        echo.
        exit /b 1
    )
    node %*
)
endlocal
