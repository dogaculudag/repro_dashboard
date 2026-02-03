# Repro Dashboard - Yerel calistirma
# 1) Docker Desktop aciksa: DB baslatilir, migrate/seed yapilir, dev server baslar
# 2) Docker kapaliysa: Sadece dev server baslar (giris/dashboard icin DB gerekir)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repro Dashboard - Yerel Baslatma" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# .env kontrolu
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env olusturuldu. Gerekirse duzenleyin." -ForegroundColor Yellow
}

# Docker ile DB baslat
try {
    $null = docker info 2>$null
    Write-Host "`nPostgreSQL (Docker) baslatiliyor..." -ForegroundColor Yellow
    docker-compose up -d db
    Start-Sleep -Seconds 5
    Write-Host "Veritabani şeması uygulanıyor..." -ForegroundColor Yellow
    npx prisma db push
    Write-Host "Seed calistiriliyor..." -ForegroundColor Yellow
    npx prisma db seed
    Write-Host "Veritabani hazir." -ForegroundColor Green
} catch {
    Write-Host "`nDocker calismiyor veya yuklu degil." -ForegroundColor Yellow
    Write-Host "Sadece dev server baslatiliyor. Giris/dashboard icin:" -ForegroundColor Gray
    Write-Host "  1) Docker Desktop'i acin" -ForegroundColor Gray
    Write-Host "  2) Bu klasorde: docker-compose up -d db" -ForegroundColor Gray
    Write-Host "  3) npx prisma db push" -ForegroundColor Gray
    Write-Host "  4) npx prisma db seed" -ForegroundColor Gray
}

Write-Host "`nDev server baslatiliyor (http://localhost:3000) ..." -ForegroundColor Cyan
npm run dev
