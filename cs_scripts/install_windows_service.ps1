# ==============================================================================
# Script de Instalacion de Windows Service para Pitaya Runner
# Ejecutar este script en PowerShell como Administrador.
# ==============================================================================
[CmdletBinding()]
param(
    [ValidateSet("install", "uninstall", "start", "stop", "status")]
    [string]$Action = "install"
)

$ServiceName = "PitayaRunnerService"
$DisplayName = "PitayaCore Script Runner and Scheduler"
$Description = "Servicio en segundo plano que ejecuta y orquesta scripts en C# (CS-Script), Node.js y Python usando config.xml"

$ScriptsDir = "C:\PitayaCode\pitayacore\cs_scripts"
$RunnerPy = Join-Path $ScriptsDir "runner.py"
$LogsDir = Join-Path $ScriptsDir "logs"

if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

$StdoutLog = Join-Path $LogsDir "service_output.log"
$StderrLog = Join-Path $LogsDir "service_error.log"

# Buscar Python
$PythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $PythonExe) {
    $PythonExe = "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python312\python.exe"
}
if (-not (Test-Path $PythonExe)) {
    Write-Error "No se encontro python.exe en el sistema."
    exit 1
}

# Comprobar NSSM
function Get-NssmPath {
    $cmd = (Get-Command nssm -ErrorAction SilentlyContinue).Source
    if ($cmd -and (Test-Path $cmd)) { return $cmd }

    $CommonPaths = @(
        "C:\ProgramData\chocolatey\bin\nssm.exe",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Links\nssm.exe",
        "$env:ProgramFiles\nssm\nssm.exe"
    )
    foreach ($p in $CommonPaths) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

$NssmExe = Get-NssmPath

function Ensure-NSSM {
    if (-not $script:NssmExe) {
        Write-Host "[INFO] NSSM no esta instalado. Instalando mediante winget..." -ForegroundColor Yellow
        winget install NSSM.NSSM --silent --accept-source-agreements --accept-package-agreements
        Start-Sleep -Seconds 3
        $script:NssmExe = Get-NssmPath
    }
    if (-not $script:NssmExe -or -not (Test-Path $script:NssmExe)) {
        Write-Error "No se pudo localizar nssm.exe tras la instalacion. Por favor ejecuta: winget install NSSM.NSSM"
        exit 1
    }
}

switch ($Action) {
    "install" {
        Ensure-NSSM
        Write-Host "[*] Registrando servicio de Windows: $ServiceName..." -ForegroundColor Cyan

        # Detener y remover si ya existe
        & $NssmExe stop $ServiceName 2>$null | Out-Null
        & $NssmExe remove $ServiceName confirm 2>$null | Out-Null

        # Instalar nuevo servicio
        & $NssmExe install $ServiceName $PythonExe "`"$RunnerPy`" --daemon"
        & $NssmExe set $ServiceName AppDirectory $ScriptsDir
        & $NssmExe set $ServiceName DisplayName $DisplayName
        & $NssmExe set $ServiceName Description $Description
        & $NssmExe set $ServiceName Start SERVICE_AUTO_START
        & $NssmExe set $ServiceName AppStdout $StdoutLog
        & $NssmExe set $ServiceName AppStderr $StderrLog
        & $NssmExe set $ServiceName AppRotateFiles 1
        & $NssmExe set $ServiceName AppRotateOnline 1
        & $NssmExe set $ServiceName AppRotateSeconds 86400
        & $NssmExe set $ServiceName AppRotateBytes 5242880

        # Iniciar servicio
        & $NssmExe start $ServiceName

        Write-Host "[OK] Servicio de Windows instalado e iniciado con exito!" -ForegroundColor Green
        Write-Host "   Nombre:        $ServiceName" -ForegroundColor White
        Write-Host "   Ejecutable:    $PythonExe $RunnerPy --daemon" -ForegroundColor White
        Write-Host "   Logs de salida: $StdoutLog" -ForegroundColor Gray
        Write-Host "   Logs de error:  $StderrLog" -ForegroundColor Gray
        Write-Host "`nPuedes verlo en el Administrador de Servicios (services.msc)." -ForegroundColor Yellow
    }

    "uninstall" {
        Ensure-NSSM
        Write-Host "[*] Deteniendo y desinstalando servicio: $ServiceName..." -ForegroundColor Yellow
        & $NssmExe stop $ServiceName 2>$null | Out-Null
        & $NssmExe remove $ServiceName confirm
        Write-Host "[OK] Servicio desinstalado exitosamente." -ForegroundColor Green
    }

    "start" {
        Ensure-NSSM
        & $NssmExe start $ServiceName
    }

    "stop" {
        Ensure-NSSM
        & $NssmExe stop $ServiceName
    }

    "status" {
        Ensure-NSSM
        & $NssmExe status $ServiceName
    }
}
