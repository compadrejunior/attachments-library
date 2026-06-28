param(
    [Parameter(Mandatory, Position = 0, HelpMessage = "Path to the Obsidian vault root")]
    [string]$Vault
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($file in @('main.js', 'manifest.json')) {
    if (-not (Test-Path (Join-Path $scriptDir $file))) {
        Write-Error "Missing '$file' — run 'npm run build' first."
        exit 1
    }
}

if (-not (Test-Path $Vault)) {
    Write-Error "Vault not found: $Vault"
    exit 1
}

$pluginDir = Join-Path $Vault ".obsidian\plugins\attachments-library"
New-Item -ItemType Directory -Force $pluginDir | Out-Null

Copy-Item (Join-Path $scriptDir 'main.js')      (Join-Path $pluginDir 'main.js')      -Force
Copy-Item (Join-Path $scriptDir 'manifest.json') (Join-Path $pluginDir 'manifest.json') -Force

Write-Host "Installed to $pluginDir"
Write-Host "Reload the plugin in Obsidian: Settings -> Community Plugins -> disable -> re-enable Attachments Library"
