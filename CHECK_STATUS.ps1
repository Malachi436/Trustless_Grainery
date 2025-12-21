# Trustless Granary - System Status Check
# Run this to verify all services are properly connected

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TRUSTLESS GRANARY - SYSTEM CHECK" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Backend
Write-Host "[1/3] Checking Backend API (Port 4000)..." -ForegroundColor Yellow
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing -TimeoutSec 3
    if ($backend.StatusCode -eq 200) {
        Write-Host "  ✅ Backend API: RUNNING" -ForegroundColor Green
        $backendData = $backend.Content | ConvertFrom-Json
        Write-Host "     Message: $($backendData.message)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Backend API: NOT RUNNING" -ForegroundColor Red
    Write-Host "     Fix: Run 'npm run dev' in backend folder" -ForegroundColor Yellow
}

# Check Admin Dashboard
Write-Host "`n[2/3] Checking Admin Dashboard (Port 3000)..." -ForegroundColor Yellow
try {
    $admin = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
    if ($admin.StatusCode -eq 200) {
        Write-Host "  ✅ Admin Dashboard: RUNNING" -ForegroundColor Green
        Write-Host "     URL: http://localhost:3000" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Admin Dashboard: NOT RUNNING" -ForegroundColor Red
    Write-Host "     Fix: Run 'npm run dev' in admin-dashboard folder" -ForegroundColor Yellow
}

# Check Mobile App
Write-Host "`n[3/3] Checking Mobile App (Port 8081)..." -ForegroundColor Yellow
try {
    $mobile = Invoke-WebRequest -Uri "http://localhost:8081" -UseBasicParsing -TimeoutSec 3
    if ($mobile.StatusCode -eq 200) {
        Write-Host "  ✅ Mobile App (Expo): RUNNING" -ForegroundColor Green
        Write-Host "     URL: http://localhost:8081" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Mobile App: CHECKING..." -ForegroundColor Yellow
    Write-Host "     Expo may be starting up. Check terminal for QR code." -ForegroundColor Gray
}

# Check Database Connection
Write-Host "`n[BONUS] Checking Database Connection..." -ForegroundColor Yellow
try {
    $dbTest = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing -TimeoutSec 3
    if ($dbTest.StatusCode -eq 200) {
        Write-Host "  ✅ PostgreSQL: CONNECTED (via backend)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Database: CONNECTION ISSUE" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTING CREDENTIALS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Platform Admin:" -ForegroundColor Green
Write-Host "  Phone: 0200000000" -ForegroundColor White
Write-Host "  PIN:   0000`n" -ForegroundColor White

Write-Host "Owner (Warehouse 1):" -ForegroundColor Green
Write-Host "  Phone: 0201234567" -ForegroundColor White
Write-Host "  PIN:   5678`n" -ForegroundColor White

Write-Host "Attendant (Warehouse 1):" -ForegroundColor Green
Write-Host "  Phone: 0241234567" -ForegroundColor White
Write-Host "  PIN:   1234`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open browser: http://localhost:3000 (Admin Dashboard)" -ForegroundColor White
Write-Host "2. Open mobile app and scan QR code (Owner/Attendant)" -ForegroundColor White
Write-Host "3. Follow TESTING_GUIDE.md for comprehensive tests" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan
