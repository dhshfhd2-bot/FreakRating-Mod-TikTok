param([string]$LauncherRepo = "..\FreakRating-Launcher")

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = (Resolve-Path (Join-Path $root $LauncherRepo)).Path

$launcherJs = Join-Path $launcher 'launcher.js'
$cur = [System.IO.File]::ReadAllText($launcherJs, [System.Text.Encoding]::UTF8)
if ($cur -notmatch 'tiktok-phone') {
  $cur = "require('./tiktok-phone.js')`n" + $cur
  [System.IO.File]::WriteAllText($launcherJs, $cur, (New-Object System.Text.UTF8Encoding($false)))
}

Copy-Item (Join-Path $root 'tiktok-phone.js') (Join-Path $launcher 'tiktok-phone.js') -Force
$mods = Join-Path $launcher 'mods'
New-Item -ItemType Directory -Force -Path $mods | Out-Null
Copy-Item (Join-Path $root 'mods\tiktok-app.js') (Join-Path $mods 'tiktok-app.js') -Force

$pkg = Join-Path $launcher 'package.json'
$json = [System.IO.File]::ReadAllText($pkg, [System.Text.Encoding]::UTF8)
if ($json -notmatch 'mods/\*\*/\*') {
  $old = '"launcher.js",'
  $new = "`"launcher.js`",`n      `"tiktok-phone.js`",`n      `"mods/**/*`","
  $json = $json.Replace($old, $new)
  [System.IO.File]::WriteAllText($pkg, $json, (New-Object System.Text.UTF8Encoding($false)))
}

Push-Location $launcher
try { npm run dist:win } finally { Pop-Location }
Write-Host "Готово: $launcher\release\FreakRating-Setup-0.4.1.exe"
