# PitayaCode PitayaCore - Web Deployment Script (Hostinger)
# Uso: .\deploy_web_hostinger.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Configuración de Hostinger
$SSH_USER = "u471794305"
$SSH_HOST = "185.212.71.206"
$SSH_PORT = "65002"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_citaia"
$REMOTE_PATH = "domains/pitayacore.pitayacode.io/public_html" 

Write-Host "--- Iniciando Despliegue Web (Hostinger) - PitayaCore ---" -ForegroundColor Cyan

try {
    # 1. Construir el proyecto
    Write-Host "Step 1: Construyendo proyecto Vite..." -ForegroundColor Yellow
    Set-Location web
    npm run build
    Set-Location ..

    # 3. Subir y Extraer en un solo paso (¡UNA SOLA CONTRASEÑA!)
    Write-Host "Step 3: Subiendo y extrayendo en Hostinger..." -ForegroundColor Yellow
    $TAR_CMD = "tar -czf - -C web/dist ."
    $SSH_CMD = "ssh -p $SSH_PORT -i $SSH_KEY -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} ""mkdir -p ${REMOTE_PATH} && cd ${REMOTE_PATH} && tar -xz -f -"""
    
    # Ejecutar el pipeline usando cmd para máxima fidelidad de binarios
    cmd /c "$TAR_CMD | $SSH_CMD"

    Write-Host "--- DESPLIEGUE WEB COMPLETADO CON ÉXITO ---" -ForegroundColor Green
    Write-Host "URL: https://pitayacore.pitayacode.io" -ForegroundColor Cyan
}
catch {
    Write-Host "Error durante el despliegue: $($_.Exception.Message)" -ForegroundColor Red
}
