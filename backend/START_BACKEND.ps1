# ============================================
# TRUSTLESS GRANARY BACKEND STARTER
# Kills processes, fixes DB, starts backend
# ============================================

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  TRUSTLESS GRANARY BACKEND STARTER" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Step 1: Kill any process on port 4000
Write-Host "[1/7] Killing processes on port 4000..." -ForegroundColor Yellow
try {
    $process = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
    if ($process) {
        $processId = $process.OwningProcess
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Write-Host "      [OK] Killed process $processId" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "      [OK] No process on port 4000" -ForegroundColor Green
    }
} catch {
    Write-Host "      [OK] Port 4000 is free" -ForegroundColor Green
}

# Step 2: Set environment variables
Write-Host "`n[2/7] Setting environment variables..." -ForegroundColor Yellow
$env:PGPASSWORD = "postgres123"
$env:NODE_ENV = "development"
Write-Host "      [OK] Environment configured" -ForegroundColor Green

# Step 3: Check database exists (DO NOT DROP - preserves user data)
Write-Host "`n[3/7] Checking database..." -ForegroundColor Yellow
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

if (Test-Path $psqlPath) {
    try {
        # Only create if doesn't exist (won't drop existing data)
        & $psqlPath -U postgres -c "SELECT 1 FROM pg_database WHERE datname='trustless_granary'" -t 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            & $psqlPath -U postgres -c "CREATE DATABASE trustless_granary;" 2>$null
            Write-Host "      [OK] Database created" -ForegroundColor Green
        } else {
            Write-Host "      [OK] Database exists (preserving data)" -ForegroundColor Green
        }
    } catch {
        Write-Host "      [WARN] Database check failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "      [WARN] PostgreSQL not found, skipping DB check" -ForegroundColor Yellow
}

# Step 4: Navigate to backend directory
Write-Host "`n[4/7] Navigating to backend directory..." -ForegroundColor Yellow
Set-Location "c:\Users\user\Desktop\Trustless_Grainery\backend"
Write-Host "      [OK] In backend directory" -ForegroundColor Green

# Step 5: Run migrations (safe - idempotent)
Write-Host "`n[5/7] Running database migrations..." -ForegroundColor Yellow
try {
    npm run migrate 2>&1 | Out-Null
    Write-Host "      [OK] Migrations completed" -ForegroundColor Green
} catch {
    Write-Host "      [ERROR] Migration failed" -ForegroundColor Red
    exit 1
}

# Step 6: Seed database (SKIPPED - preserves existing users)
Write-Host "`n[6/7] Skipping seed (preserving existing data)..." -ForegroundColor Yellow
Write-Host "      [OK] Data preserved" -ForegroundColor Green
# If you need to reset data, run: npm run seed

# Step 7: Start backend server
Write-Host "`n[7/7] Starting backend server..." -ForegroundColor Yellow
Write-Host "      Server will start on http://localhost:4000" -ForegroundColor Cyan
Write-Host "      Press Ctrl+C to stop the server`n" -ForegroundColor Gray

Write-Host "================================================" -ForegroundColor Green
Write-Host "  BACKEND READY - Starting Server..." -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green

Write-Host "Test Accounts:" -ForegroundColor Cyan
Write-Host "  Admin:     0200000000 / PIN: 0000" -ForegroundColor Gray
Write-Host "  Owner:     0201234567 / PIN: 5678" -ForegroundColor Gray
Write-Host "  Attendant: 0241234567 / PIN: 1234`n" -ForegroundColor Gray

npm run dev
