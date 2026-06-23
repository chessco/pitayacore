# Script para sincronizar SOLO el esquema (Estructura) con Producción
# Sin tocar los datos reales de los clientes.
# Uso: .\push_schema_to_prod.ps1

$SERVER_IP = "46.224.155.43"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_citaia"

Write-Host "--- Actualizando ESQUEMA de Producción (Sin tocar datos) ---" -ForegroundColor Yellow

# 1. Subir los archivos de esquema actuales a una zona temporal
Write-Host "Step 1: Subiendo esquemas locales..." -ForegroundColor Cyan
scp -i $SSH_KEY api/prisma/mysql.prisma root@${SERVER_IP}:/opt/pitaya/pitayacore/api/prisma/mysql.prisma
scp -i $SSH_KEY api/prisma/postgres.prisma root@${SERVER_IP}:/opt/pitaya/pitayacore/api/prisma/postgres.prisma

if ($LASTEXITCODE -ne 0) { Write-Host "❌ Error al subir el esquema." -ForegroundColor Red; exit }

# 2. Ejecutar db push en el contenedor remoto
Write-Host "Step 2: Aplicando cambios estructurales en Producción..." -ForegroundColor Cyan
ssh -i $SSH_KEY root@$SERVER_IP "docker exec pitayacore-api-prod npx prisma db push --schema=prisma/mysql.prisma --accept-data-loss=false"
ssh -i $SSH_KEY root@$SERVER_IP "docker exec pitayacore-api-prod npx prisma db push --schema=prisma/postgres.prisma --accept-data-loss=false"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Esquema actualizado correctamente. Los datos de producción se han preservado." -ForegroundColor Green
} else {
    Write-Host "❌ Error al aplicar el esquema. Es posible que haya cambios incompatibles que requieran revisión manual." -ForegroundColor Red
}
