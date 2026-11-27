param([string]$ClientDir = "..\FreakRating-Clean")

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$client = (Resolve-Path (Join-Path $root $ClientDir)).Path
$launcher = Join-Path $client 'launcher.js'

Copy-Item (Join-Path $root 'tiktok-phone.js') (Join-Path $client 'tiktok-phone.js') -Force
$cur = [System.IO.File]::ReadAllText($launcher, [System.Text.Encoding]::UTF8)
if ($cur -notmatch 'tiktok-phone') {
  $cur = $cur.Replace("load('./mod-loader.js');", "load('./mod-loader.js');`nload('./tiktok-phone.js');")
  [System.IO.File]::WriteAllText($launcher, $cur, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host '[tiktok] строка загрузки добавлена в launcher.js'
} else {
  Write-Host '[tiktok] уже подключён'
}
