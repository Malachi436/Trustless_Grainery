#!/usr/bin/env pwsh
# Start all services: Backend, Admin Dashboard, Owner Dashboard, and Mobile Frontend

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Starting Trustless Grainery..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get the project root
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; npm run dev" -WindowStyle Normal

# Wait for backend to start
Start-Sleep -Seconds 3

# Start Admin Dashboard
Write-Host "Starting Admin Dashboard..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\admin-dashboard'; npm run dev" -WindowStyle Normal

# Wait for admin dashboard
Start-Sleep -Seconds 2

# Start Owner Dashboard
Write-Host "Starting Owner Dashboard..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\owner-dashboard'; npm run dev" -WindowStyle Normal

# Wait for owner dashboard
Start-Sleep -Seconds 2

# Start Mobile Frontend
Write-Host "Starting Mobile Frontend..." -ForegroundColor Green
Write-Host "Scan the QR code with Expo Go or press 'i' (iOS) / 'a' (Android)" -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "All services started!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  Backend:           http://localhost:4000" -ForegroundColor White
Write-Host "  Admin Dashboard:   http://localhost:3001" -ForegroundColor White
Write-Host "  Owner Dashboard:   http://localhost:3000" -ForegroundColor White
Write-Host "  Mobile Frontend:   Scan QR code or use 'i'/'a'" -ForegroundColor White
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "  Owner - Phone: 0201234567, PIN: 5678" -ForegroundColor White
Write-Host "  Admin - Phone: 0200000000, PIN: 0000" -ForegroundColor White
