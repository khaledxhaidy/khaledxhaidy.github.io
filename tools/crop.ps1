# Crops a rectangle out of a PNG (keeps transparency).
#   .\tools\crop.ps1 -In assets\x.png -Out assets\y.png -X 0 -Y 0 -W 100 -H 100
param(
    [Parameter(Mandatory)][string]$In,
    [Parameter(Mandatory)][string]$Out,
    [Parameter(Mandatory)][int]$X,
    [Parameter(Mandatory)][int]$Y,
    [Parameter(Mandatory)][int]$W,
    [Parameter(Mandatory)][int]$H
)
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$inF  = if ([System.IO.Path]::IsPathRooted($In))  { $In }  else { Join-Path $root $In }
$outF = if ([System.IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $root $Out }

$src = [System.Drawing.Image]::FromFile($inF)
try {
    $W = [Math]::Min($W, $src.Width - $X)
    $H = [Math]::Min($H, $src.Height - $Y)
    $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.DrawImage($src,
        (New-Object System.Drawing.Rectangle(0, 0, $W, $H)),
        (New-Object System.Drawing.Rectangle($X, $Y, $W, $H)),
        [System.Drawing.GraphicsUnit]::Pixel)
    $bmp.Save($outF, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    "{0}  {1}x{2}" -f (Split-Path -Leaf $outF), $W, $H
}
finally { $src.Dispose() }
