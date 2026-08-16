Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root "src\assets\logo-tabdock.png"
$iconDir = Join-Path $root "public\icons"

if (-not (Test-Path $sourcePath)) {
  throw "Source logo not found: $sourcePath"
}

if (-not (Test-Path $iconDir)) {
  New-Item -ItemType Directory -Path $iconDir | Out-Null
}

$source = [System.Drawing.Image]::FromFile($sourcePath)

function Save-ResizedIcon([int]$size, [string]$path, [System.Drawing.Image]$src) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::FromArgb(255, 21, 21, 21))
  $g.DrawImage($src, 0, 0, $size, $size)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

Save-ResizedIcon 16 (Join-Path $iconDir "icon-16.png") $source
Save-ResizedIcon 32 (Join-Path $iconDir "icon-32.png") $source
Save-ResizedIcon 48 (Join-Path $iconDir "icon-48.png") $source
Save-ResizedIcon 128 (Join-Path $iconDir "icon-128.png") $source

$source.Dispose()
Write-Output "Icons written from logo-tabdock.png"
