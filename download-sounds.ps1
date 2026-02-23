# ─────────────────────────────────────────────────────────────────────────────
# Catatonica — Sound Downloader
# Run this once to grab your 4 ambient sounds from Pixabay
# Usage: Right-click > Run with PowerShell
# ─────────────────────────────────────────────────────────────────────────────

$sounds = @(
    @{ name = "rain";         url = "PASTE_RAIN_URL_HERE" },
    @{ name = "ocean";        url = "PASTE_OCEAN_URL_HERE" },
    @{ name = "brown-noise";  url = "PASTE_BROWNNOISE_URL_HERE" },
    @{ name = "drone";        url = "PASTE_DRONE_URL_HERE" }
)

$outputDir = "$PSScriptRoot\sounds"
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

foreach ($sound in $sounds) {
    if ($sound.url -like "PASTE*") {
        Write-Host "⚠  Skipping $($sound.name) — no URL provided yet" -ForegroundColor Yellow
        continue
    }
    $dest = "$outputDir\$($sound.name).mp3"
    Write-Host "⬇  Downloading $($sound.name)..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $sound.url -OutFile $dest -UseBasicParsing
    Write-Host "✓  Saved to sounds\$($sound.name).mp3" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! Now run: git add -A && git commit -m 'feat: add ambient sounds' && git push" -ForegroundColor Magenta
