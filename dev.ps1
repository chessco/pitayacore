# PitayaCore AI - Local Development Launcher
# Este script inicia el API y el Web en ventanas externas

Write-Host "🚀 Iniciando PitayaCore AI en modo local..." -ForegroundColor Cyan

# 1. Verificar/Iniciar Infraestructura (Docker)
Write-Host "📦 Verificando bases de datos (Docker)..." -ForegroundColor Yellow
docker compose up -d mysql postgres

# 2. Inicializar Skills
Write-Host "🧠 Inicializando Skills..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\api"
npx ts-node init-skills-fixed.ts
Set-Location "$PSScriptRoot"

# 2. Iniciar API (NestJS) en ventana externa
Write-Host "🔌 Iniciando Backend API..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$PSScriptRoot\api" -ArgumentList "-NoExit", "-Command", "Write-Host '--- PITAYACORE API (NESTJS) ---' -ForegroundColor Cyan; npm run start:dev"

# 3. Iniciar Web (React + Vite) en ventana externa
Write-Host "💻 Iniciando Frontend Web..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$PSScriptRoot\web" -ArgumentList "-NoExit", "-Command", "Write-Host '--- PITAYACORE WEB (VITE) ---' -ForegroundColor Cyan; npm run dev"

Write-Host "✅ Todo listo. Las ventanas externas se han abierto." -ForegroundColor Green
Write-Host "API: http://localhost:3015" -ForegroundColor Gray
Write-Host "Web: http://localhost:3000" -ForegroundColor Gray
