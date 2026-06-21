# PitayaCore AI - Local Development Launcher
# Este script inicia el API y el Web en ventanas externas

Write-Host "🚀 Iniciando PitayaCore AI en modo local..." -ForegroundColor Cyan

# Determinar directorio base de manera dinámica y agnóstica
$BaseDir = $PSScriptRoot
if (-not $BaseDir) {
    $BaseDir = Get-Location
}
if (-not (Test-Path "$BaseDir\api")) {
    if (Test-Path "$BaseDir\pitayacore\api") {
        $BaseDir = "$BaseDir\pitayacore"
    }
}

# Asegurar que estamos en el directorio base correcto
Set-Location $BaseDir

# 1. Verificar/Iniciar Infraestructura (Docker)
Write-Host "📦 Verificando bases de datos (Docker)..." -ForegroundColor Yellow
docker compose up -d mysql postgres

# 2. Inicializar Skills
Write-Host "🧠 Inicializando Skills..." -ForegroundColor Cyan
Set-Location "$BaseDir\api"
npx ts-node init-skills-fixed.ts
Set-Location "$BaseDir"

# 3. Iniciar API (NestJS) en ventana externa (forzando Set-Location por si el perfil de Powershell cambia la ruta)
Write-Host "🔌 Iniciando Backend API..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$BaseDir\api" -ArgumentList "-NoExit", "-Command", "Set-Location '$BaseDir\api'; Write-Host '--- PITAYACORE API (NESTJS) ---' -ForegroundColor Cyan; npm run start:dev"

# 4. Iniciar Web (React + Vite) en ventana externa (forzando Set-Location por si el perfil de Powershell cambia la ruta)
Write-Host "💻 Iniciando Frontend Web..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$BaseDir\web" -ArgumentList "-NoExit", "-Command", "Set-Location '$BaseDir\web'; Write-Host '--- PITAYACORE WEB (VITE) ---' -ForegroundColor Cyan; npm run dev"

Write-Host "✅ Todo listo. Las ventanas externas se han abierto." -ForegroundColor Green
Write-Host "API: http://localhost:3015" -ForegroundColor Gray
Write-Host "Web: http://localhost:3000" -ForegroundColor Gray
