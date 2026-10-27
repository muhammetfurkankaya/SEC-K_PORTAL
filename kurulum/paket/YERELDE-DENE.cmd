@echo off
rem ============================================================
rem  SEC-K Portali - kendi bilgisayarinizda deneme
rem ============================================================
rem
rem  Bu dosyaya CIFT TIKLAYIN. Yonetici yetkisi gerekmez, hicbir sey
rem  kurulmaz, IIS gerekmez. Portal bu pencere acik oldugu surece
rem  http://localhost:3000 adresinde calisir; pencereyi kapatinca durur.
rem
rem  Deneme verileri AYRI bir klasore yazilir: data-deneme\
rem  Sunucuya gidecek data\ klasorune dokunulmaz.
rem
rem  Ilk calistirmada ornek bultenler ve bir ornek anket eklenir.
rem  Sifirdan baslamak icin data-deneme klasorunu silin.
rem
rem  3000 portu doluysa baska bir port verebilirsiniz:
rem    YERELDE-DENE.cmd 3010

setlocal
cd /d "%~dp0"

if not exist "node\node.exe" (
    echo.
    echo   node\node.exe bulunamadi.
    echo   SEC-K-Portali-node.zip arsivini de AYNI klasore acin.
    echo.
    pause
    exit /b 1
)

set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"

rem Deneme verisi ayri klasorde: sunucuya gidecek data\ temiz kalir.
set "SECK_DATA_DIR=%~dp0data-deneme"
rem Yalnizca bu bilgisayardan erisilir; guvenlik duvari sormaz.
set "HOSTNAME=127.0.0.1"
set "NODE_ENV=production"
rem Yerelde HTTPS yok: .env'de HTTPS ayari olsa bile giris calissin.
set "SECK_SECURE_COOKIE=false"
set "SECK_BASE_URL=http://localhost:%PORT%"

if not exist "%SECK_DATA_DIR%\portal.db" (
    echo.
    echo   Ilk calistirma: veritabani ve ornek veriler hazirlaniyor...
    "node\node.exe" komutlar\seed.cjs
    if errorlevel 1 goto hata
    "node\node.exe" komutlar\demo.cjs
    if errorlevel 1 goto hata
)

echo.
echo   ============================================================
echo     SEC-K Portali calisiyor
echo   ============================================================
echo.
echo     Portal         : http://localhost:%PORT%
echo     Yonetim paneli : http://localhost:%PORT%/admin
echo     Giris          : admin / Tfs2026...
echo.
echo     Durdurmak icin bu pencereyi kapatin.
echo     Deneme verileri: data-deneme\
echo.

rem Tarayiciyi portal ayaga kalktiktan sonra ac.
start "" cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:%PORT%"

"node\node.exe" baslat.cjs
echo.
echo   Portal durdu.
pause
exit /b 0

:hata
echo.
echo   Hazirlik tamamlanamadi. Yukaridaki mesaji okuyun.
echo.
pause
exit /b 1
