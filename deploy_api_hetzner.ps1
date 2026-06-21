# PitayaCode PitayaCore - Production Deploy Script (Hetzner)
# Uso: .\deploy_api_hetzner.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$SERVER_IP = "46.224.155.43"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_citaia"

Write-Host "--- Iniciando Despliegue de Producción (Hetzner) - PitayaCore ---" -ForegroundColor Cyan

try {
    Write-Host "Step 1: Empaquetando y subiendo código y configuración..." -ForegroundColor Yellow
    
    # Comprimir api y archivos de compose (excluyendo node_modules y dist)
    tar --exclude="node_modules" --exclude="dist" --exclude="api/public/uploads" -czf deploy_pitayacore_api.tar.gz api docker-compose.prod.yml
    
    scp -i $SSH_KEY -o StrictHostKeyChecking=no deploy_pitayacore_api.tar.gz root@${SERVER_IP}:/opt/pitaya/pitayacore/

    Write-Host "Step 2: Descomprimiendo y reconstruyendo en el servidor..." -ForegroundColor Yellow
    
    $remoteCommands = @"
        mkdir -p /opt/pitaya/pitayacore
        cd /opt/pitaya/pitayacore
        
        echo 'Limpiando conflictos de contenedores antiguos...'
        # Detener cualquier contenedor que pueda estar usando el puerto 3015
        docker stop pitayacore-api-prod pitayacore-api 2>/dev/null || true
        docker rm pitayacore-api-prod pitayacore-api 2>/dev/null || true
        
        echo 'Descomprimiendo archivos...'
        tar -xzf deploy_pitayacore_api.tar.gz
        rm deploy_pitayacore_api.tar.gz
        
        echo 'Configurando entorno de producción...'
        # Asegurarse de que el archivo .env.pitayacore se copie como .env.pitayacore
        cp api/.env.pitayacore api/.env.pitayacore 2>/dev/null || true
        
        echo 'Reconstruyendo contenedores...'
        docker compose -f docker-compose.prod.yml up -d --build
        
        echo 'Esperando inicialización (5s)...'
        sleep 5
        
        echo 'Ejecutando migraciones y scripts de sistema...'
        docker exec pitayacore-api npx prisma db push --schema=prisma/mysql.prisma
        sleep 2
        docker exec pitayacore-api node create-system-user.js
        
        echo 'Estado final del contenedor:'
        docker ps --filter name=pitayacore-api
        
        echo 'Últimos logs:'
        docker logs --tail 20 pitayacore-api
"@

    ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP $remoteCommands

    Write-Host "--- DESPLIEGUE API COMPLETADO CON ÉXITO ---" -ForegroundColor Green
}
catch {
    Write-Host "Error durante el despliegue: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path "deploy_pitayacore_api.tar.gz") { Remove-Item "deploy_pitayacore_api.tar.gz" }
}
