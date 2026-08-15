# Cuts the wax seal out of the public-domain sealed-letter photo and saves it
# as a round PNG with alpha, plus a web-sized copy of the letter itself.
Add-Type -AssemblyName System.Drawing

$root   = Split-Path -Parent $PSScriptRoot
$src    = Join-Path $root 'scratch\stock\keep-waxletter.png'
$outDir = Join-Path $root 'assets'

# centre and radius of the wax blob within the 1024x720 source
$cx = 517; $cy = 335; $r = 118

$img = [System.Drawing.Image]::FromFile($src)
try {
    $size = $r * 2
    $bmp  = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g    = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # clip to a circle so the aged paper around the wax is dropped
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)

    $srcRect = New-Object System.Drawing.Rectangle(($cx - $r), ($cy - $r), $size, $size)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $bmp.Save((Join-Path $outDir 'seal-real.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    "seal-real.png  ${size}x${size}"

    $g.Dispose(); $bmp.Dispose(); $path.Dispose()

    # the letter itself, web-sized
    $w = 1100
    $h = [int][Math]::Round($img.Height * ($w / $img.Width))
    $lb = New-Object System.Drawing.Bitmap($w, $h)
    $lg = [System.Drawing.Graphics]::FromImage($lb)
    $lg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $lg.DrawImage($img, 0, 0, $w, $h)

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $prm = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $prm.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]84)
    $lb.Save((Join-Path $outDir 'envelope-real.jpg'), $codec, $prm)
    "envelope-real.jpg  ${w}x${h}"

    $lg.Dispose(); $lb.Dispose()
}
finally { $img.Dispose() }
