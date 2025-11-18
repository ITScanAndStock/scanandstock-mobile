# Script PowerShell pour capturer les logs de l'application ScanAndStock
# Usage: .\capture-logs.ps1

Write-Host "🔍 Capture des logs de l'application ScanAndStock..." -ForegroundColor Cyan

# Vérifier si adb est installé
$adbPath = Get-Command adb -ErrorAction SilentlyContinue

if (-not $adbPath) {
    Write-Host "❌ ADB n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "💡 Installez Android Platform Tools: https://developer.android.com/tools/releases/platform-tools" -ForegroundColor Yellow
    exit 1
}

# Vérifier si un appareil est connecté
$devices = adb devices | Select-String -Pattern "device$"

if ($devices.Count -eq 0) {
    Write-Host "❌ Aucun appareil Android connecté" -ForegroundColor Red
    Write-Host "💡 Connectez votre téléphone en USB et activez le débogage USB" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Appareil détecté" -ForegroundColor Green

# Créer un dossier pour les logs
$logDir = "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = "$logDir\app-logs_$timestamp.txt"

Write-Host "📝 Capture des logs en cours..." -ForegroundColor Cyan
Write-Host "   Fichier: $logFile" -ForegroundColor Gray

# Capturer les logs
adb logcat -d | Select-String -Pattern "🔍|🚀|✅|❌|🔧|🌍|🎯|⏳|ReactNativeJS|Expo" | Out-File -FilePath $logFile -Encoding UTF8

Write-Host "✅ Logs capturés avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Fichier de logs: $logFile" -ForegroundColor Cyan

# Afficher un aperçu des logs
Write-Host ""
Write-Host "📊 Aperçu des dernières lignes:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Gray
Get-Content $logFile | Select-Object -Last 20

Write-Host ""
Write-Host "💡 Pour voir tous les logs en temps réel, exécutez:" -ForegroundColor Yellow
Write-Host "   adb logcat | Select-String -Pattern '🔍|🚀|✅|❌|🔧|🌍|🎯|⏳'" -ForegroundColor Gray
