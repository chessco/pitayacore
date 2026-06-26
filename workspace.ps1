# PitayaCode PitayaCore - Workspace CLI Runner
# Uso: .\workspace.ps1

$ErrorActionPreference = "Stop"

# Guardar la ruta original donde estabas
$OriginalPath = Get-Location

try {
    # Ir a la carpeta del CLI y correrlo con uv
    Set-Location "$PSScriptRoot\cli"
    uv run python main.py
}
finally {
    # Al salir del CLI, regresamos automáticamente a la carpeta original
    Set-Location $OriginalPath
}
