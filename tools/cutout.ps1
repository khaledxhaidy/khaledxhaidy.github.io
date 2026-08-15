# Removes the flat background from an image and writes a transparent PNG.
#
# Flood-fills inwards from the border, so white *inside* the subject
# (a note, a pale flap) is kept — only the connected background goes.
#
#   .\tools\cutout.ps1 -In assets\stamp.png -Out assets\seal.png -Tolerance 46
param(
    [Parameter(Mandatory = $true)][string]$In,
    [Parameter(Mandatory = $true)][string]$Out,
    [int]$Tolerance = 40,
    [int]$Feather = 1
)

Add-Type -AssemblyName System.Drawing

$code = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class Cutout
{
    public static string Run(string inPath, string outPath, int tol, int feather)
    {
        using (var src = new Bitmap(inPath))
        {
            int w = src.Width, h = src.Height;
            var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(bmp)) g.DrawImage(src, 0, 0, w, h);

            var rect = new Rectangle(0, 0, w, h);
            var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            var buf = new byte[stride * h];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, buf, 0, buf.Length);

            // seed colour = average of the four corners
            int sr = 0, sg = 0, sb = 0;
            int[][] corners = { new[]{0,0}, new[]{w-1,0}, new[]{0,h-1}, new[]{w-1,h-1} };
            foreach (var c in corners)
            {
                int o = c[1] * stride + c[0] * 4;
                sb += buf[o]; sg += buf[o+1]; sr += buf[o+2];
            }
            sr /= 4; sg /= 4; sb /= 4;

            var visited = new bool[w * h];
            var q = new Queue<int>();

            Action<int,int> seed = (x, y) => {
                int i = y * w + x;
                if (visited[i]) return;
                int o = y * stride + x * 4;
                int dr = buf[o+2] - sr, dg = buf[o+1] - sg, db = buf[o] - sb;
                if (Math.Sqrt(dr*dr + dg*dg + db*db) <= tol) { visited[i] = true; q.Enqueue(i); }
            };

            for (int x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
            for (int y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }

            int[] dx = { 1, -1, 0, 0 };
            int[] dy = { 0, 0, 1, -1 };

            while (q.Count > 0)
            {
                int i = q.Dequeue();
                int x = i % w, y = i / w;
                buf[y * stride + x * 4 + 3] = 0;               // clear alpha

                for (int k = 0; k < 4; k++)
                {
                    int nx = x + dx[k], ny = y + dy[k];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    int ni = ny * w + nx;
                    if (visited[ni]) continue;
                    int o = ny * stride + nx * 4;
                    int dr = buf[o+2] - sr, dg = buf[o+1] - sg, db = buf[o] - sb;
                    if (Math.Sqrt(dr*dr + dg*dg + db*db) <= tol) { visited[ni] = true; q.Enqueue(ni); }
                }
            }

            // soften the cut edge so it doesn't look stamped out
            for (int pass = 0; pass < feather; pass++)
            {
                var alpha = new byte[w * h];
                for (int y = 0; y < h; y++)
                    for (int x = 0; x < w; x++)
                        alpha[y * w + x] = buf[y * stride + x * 4 + 3];

                for (int y = 1; y < h - 1; y++)
                {
                    for (int x = 1; x < w - 1; x++)
                    {
                        int sum = 0;
                        for (int ky = -1; ky <= 1; ky++)
                            for (int kx = -1; kx <= 1; kx++)
                                sum += alpha[(y + ky) * w + (x + kx)];
                        int avg = sum / 9;
                        int cur = alpha[y * w + x];
                        if (cur > 0 && avg < 255) buf[y * stride + x * 4 + 3] = (byte)avg;
                    }
                }
            }

            int kept = 0;
            for (int i = 0; i < w * h; i++) if (!visited[i]) kept++;

            System.Runtime.InteropServices.Marshal.Copy(buf, 0, data.Scan0, buf.Length);
            bmp.UnlockBits(data);
            bmp.Save(outPath, ImageFormat.Png);
            bmp.Dispose();

            return string.Format("{0}x{1}  kept {2}% of pixels", w, h, (int)(100.0 * kept / (w * h)));
        }
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing -ErrorAction SilentlyContinue

$root = Split-Path -Parent $PSScriptRoot
$inFull  = if ([System.IO.Path]::IsPathRooted($In))  { $In }  else { Join-Path $root $In }
$outFull = if ([System.IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $root $Out }

[Cutout]::Run($inFull, $outFull, $Tolerance, $Feather)
