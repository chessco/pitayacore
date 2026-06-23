# Script para sincronizar Producción -> Local (Docker)
# Uso: .\sync_prod_to_local.ps1

$DB_NAME = "pitayacore_db"
$REMOTE_HOST = "46.224.155.43"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_citaia"

Write-Host "--- Sincronizando: Producción >> Local ---" -ForegroundColor Yellow

# 1. Exportar en Producción
Write-Host "Step 1: Creando backup en el servidor remoto..." -ForegroundColor Cyan
ssh -i $SSH_KEY "root@${REMOTE_HOST}" "docker exec luxury-mysql-prod mysqldump -u root -pluxury_pass --databases $DB_NAME > ~/prod_dump.sql"

# 2. Descargar a Local
Write-Host "Step 2: Descargando backup a tu computadora..." -ForegroundColor Cyan
scp -i $SSH_KEY "root@${REMOTE_HOST}:~/prod_dump.sql" ./prod_dump.sql

# 3. Importar en Docker Local
Write-Host "Step 3: Importando en tu Docker local (luxury-mysql-prod)..." -ForegroundColor Cyan
& docker exec -i luxury-mysql-prod mysql -u root -pacuacore_pass $DB_NAME < ./prod_dump.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ¡Éxito! Tu base de datos local ahora es idéntica a la de Producción." -ForegroundColor Green
    Remove-Item ./prod_dump.sql
} else {
    Write-Host "❌ Error al importar en Docker local." -ForegroundColor Red
}
