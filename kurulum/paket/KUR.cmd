@echo off
rem ============================================================
rem  SEC-K Portali - kurulum
rem ============================================================
rem
rem  Bu dosyaya SAG TIKLAYIP "Yonetici olarak calistir" secin.
rem
rem  Hicbir sey indirmeniz gerekmez: portalin calistiricisi
rem  (node\node.exe) ve tum bilesenleri pakette geliyor. Portal kendi
rem  web sunucusunu barindirir, IIS eklentisi gerektirmez.
rem
rem  Yaptigi is:
rem    - Portun bos olmasini saglar (gerekirse portu tutan IIS sitesini durdurur)
rem    - Veritabanini ve yonetici hesabini olusturur
rem    - .env ve data\ izinlerini kisitlar
rem    - Sunucu acilisinda portali baslatan bir Windows gorevi kurar
rem    - Guvenlik duvarinda portu ic aga acar ve portali baslatir

setlocal
cd /d "%~dp0"

echo.
echo   ============================================================
echo     SEC-K Portali - kurulum
echo   ============================================================
echo.

rem ----------------- Yonetici kontrolu -----------------
net session >nul 2>&1
if errorlevel 1 (
    echo   [HATA] Bu pencere yonetici yetkisiyle acilmamis.
    echo.
    echo   Yapmaniz gereken:
    echo     1. Bu pencereyi kapatin
    echo     2. KUR.cmd dosyasina SAG TIKLAYIN
    echo     3. "Yonetici olarak calistir" secin
    echo.
    echo   Neden: portal Windows gorevi olusturur, guvenlik duvarinda port
    echo   acar ve dosya izinlerini kisitlar. Bunlar yonetici yetkisi ister.
    echo.
    pause
    exit /b 1
)

rem ----------------- Paket kontrolu -----------------
if not exist "%~dp0baslat.cjs" (
    echo   [HATA] baslat.cjs bulunamadi.
    echo   Bu dosyayi paketin kok klasorunden calistirin.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0node\node.exe" (
    echo   [UYARI] node\node.exe bulunamadi.
    echo.
    echo   Paket iki arsiv halinde geldiyse ikincisini de AYNI klasore
    echo   acmalisiniz ^(SEC-K-Portali-node.zip icinde node\node.exe var^).
    echo   Sistemde Node.js 20/22 kuruluysa yine de devam edebilir.
    echo.
    pause
)

rem ----------------- Port -----------------
set "PORT=%~1"
if "%PORT%"=="" (
    echo   Portal hangi portu dinleyecek?
    echo   Bu uygulama icin ayrilan portu yazin ^(ornek: 9092^).
    echo.
    set /p PORT=  Port [Enter = 3000] :
)
if "%PORT%"=="" set "PORT=3000"

rem Port sayi olmali; degilse PowerShell anlasilmaz bir tur hatasi verir.
echo %PORT%| findstr /r "^[1-9][0-9]*$" >nul
if errorlevel 1 (
    echo.
    echo   [HATA] "%PORT%" gecerli bir port numarasi degil.
    echo   Yalnizca rakam yazin, ornegin: 9092
    echo.
    pause
    exit /b 1
)

rem ----------------- Dis adres -----------------
set "ADRES=%~2"
if "%ADRES%"=="" (
    echo.
    echo   Portalin agdan erisilecegi adres ^(anket QR kodlarinda kullanilir^).
    echo   Ornek: http://10.34.32.55:%PORT%
    echo.
    set /p ADRES=  Adres [Enter = http://%COMPUTERNAME%:%PORT%] :
)
if "%ADRES%"=="" set "ADRES=http://%COMPUTERNAME%:%PORT%"

echo.
echo   Port  : %PORT%
echo   Adres : %ADRES%
echo.
echo   Kurulum basliyor...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kur.ps1" -Port %PORT% -BaseUrl "%ADRES%" -PortuBosalt

echo.
echo   ============================================================
echo     Pencereyi kapatmak icin bir tusa basin.
echo   ============================================================
pause >nul
endlocal
