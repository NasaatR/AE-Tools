[CmdletBinding()]
param([Parameter(Mandatory)][string]$SignTool,
      [Parameter(Mandatory)][string]$Certificate,
      [string]$Nsis = "${env:ProgramFiles(x86)}\NSIS\makensis.exe")
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path "$PSScriptRoot/..").Path
Push-Location $root
try {
  if (!(Test-Path $Nsis)) { throw 'NSIS 3 is required for the installer build.' }
  if (!$env:AETOOLS_CERT_PASSWORD) { throw 'Supply AETOOLS_CERT_PASSWORD through the signing environment.' }
  $out = Join-Path $root 'build'
  $zxp = Join-Path $out 'AE-Tools-1.0.zxp'
  if (Test-Path $zxp) { throw 'Signed output exists. Use a clean build directory.' }
  & $SignTool -sign "$out/panel" $zxp $Certificate $env:AETOOLS_CERT_PASSWORD
  if ($LASTEXITCODE -ne 0 -or !(Test-Path $zxp)) { throw 'Adobe ZXP signing failed.' }
  & $SignTool -verify $zxp -certinfo
  if ($LASTEXITCODE -ne 0) { throw 'Adobe ZXP verification failed.' }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($zxp, "$out/signed")
  foreach ($f in Get-ChildItem "$out/panel" -Recurse -File) {
    $relative = $f.FullName.Substring(("$out/panel").Length + 1)
    if ((Get-FileHash $f.FullName).Hash -ne (Get-FileHash (Join-Path "$out/signed" $relative)).Hash) { throw "Changed package entry: $relative" }
  }
  node -e "const b=require('./tools/build'); b.checkES3(require('fs').readFileSync('build/signed/host.jsx','utf8'),'signed/host.jsx')"
  if ($LASTEXITCODE -ne 0) { throw 'Packaged host syntax check failed.' }
  & $Nsis /V2 installer/setup.nsi
  if ($LASTEXITCODE -ne 0 -or !(Test-Path "$out/AE-Tools-1.0-Setup.exe")) { throw 'NSIS build failed.' }
} finally { Pop-Location }
