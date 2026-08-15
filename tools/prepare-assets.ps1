# Resizes and re-encodes the source WhatsApp photos into web-ready assets/.
# Run once after dropping new photos into source-photos/.
Add-Type -AssemblyName System.Drawing

$root   = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $root 'source-photos'
$outDir = Join-Path $root 'assets'

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }

function Convert-Photo {
    param([string]$Source, [string]$OutName, [int]$MaxEdge, [int]$Quality)

    $img = [System.Drawing.Image]::FromFile($Source)
    try {
        $scale = [Math]::Min(1.0, $MaxEdge / [Math]::Max($img.Width, $img.Height))
        $w = [int][Math]::Round($img.Width * $scale)
        $h = [int][Math]::Round($img.Height * $scale)

        $bmp = New-Object System.Drawing.Bitmap($w, $h)
        $g   = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.DrawImage($img, 0, 0, $w, $h)

        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)

        $dest = Join-Path $outDir $OutName
        $bmp.Save($dest, $jpegCodec, $params)

        $kb = [int]((Get-Item $dest).Length / 1KB)
        Write-Output ("{0,-18} {1}x{2}  {3} KB" -f $OutName, $w, $h, $kb)
    }
    finally {
        if ($g)   { $g.Dispose() }
        if ($bmp) { $bmp.Dispose() }
        $img.Dispose()
    }
}

$map = @(
    @{ File = 'WhatsApp Image 2026-08-15 at 8.15.06 PM.jpeg';     Out = 'couple-hero.jpg';  Max = 1200; Q = 82 },
    @{ File = 'WhatsApp Image 2026-08-15 at 8.15.06 PM (1).jpeg'; Out = 'couple-story.jpg'; Max = 1100; Q = 82 },
    @{ File = 'WhatsApp Image 2026-08-15 at 8.16.22 PM (1).jpeg'; Out = 'venue-main.jpg';   Max = 1500; Q = 80 },
    @{ File = 'WhatsApp Image 2026-08-15 at 8.16.23 PM.jpeg';     Out = 'venue-night.jpg';  Max = 1000; Q = 78 },
    @{ File = 'WhatsApp Image 2026-08-15 at 8.16.22 PM (2).jpeg'; Out = 'venue-day.jpg';    Max = 1000; Q = 78 },
    @{ File = 'WhatsApp Image 2026-08-15 at 8.16.22 PM.jpeg';     Out = 'venue-wide.jpg';   Max = 1000; Q = 78 }
)

foreach ($m in $map) {
    $src = Join-Path $srcDir $m.File
    if (Test-Path $src) {
        Convert-Photo -Source $src -OutName $m.Out -MaxEdge $m.Max -Quality $m.Q
    } else {
        Write-Output ("MISSING: {0}" -f $m.File)
    }
}
