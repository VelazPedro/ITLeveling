# =========================================================
# Compila IT Leveling en un unico .exe portable.
# Requisitos (una sola vez):  python -m pip install pywebview pyinstaller
# Uso:                        .\build.ps1
# Resultado:                  dist\IT Leveling.exe
# =========================================================

# PyInstaller escribe su log por stderr; en Windows PowerShell eso se toma como
# error aunque termine bien, asi que no usamos -ErrorAction Stop y miramos el codigo de salida.
$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

Write-Host "Compilando IT Leveling..." -ForegroundColor Cyan

python -m PyInstaller `
    --noconfirm `
    --clean `
    --onefile `
    --windowed `
    --name "IT Leveling" `
    --add-data "index.html;." `
    --add-data "css;css" `
    --add-data "js;js" `
    main.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Listo: dist\IT Leveling.exe" -ForegroundColor Green
    Write-Host "Los datos se guardan en $env:LOCALAPPDATA\ITLeveling"
} else {
    Write-Host ""
    Write-Host "La compilacion fallo (codigo $LASTEXITCODE)." -ForegroundColor Red
}
