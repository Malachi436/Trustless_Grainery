# Trustless Granary Backend Test Script
# Tests the complete workflow: Login → Dashboard → Stock → Requests

Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TRUSTLESS GRANARY BACKEND TEST             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:4000/api"

# Test 1: Health Check
Write-Host "📊 Test 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Method Get -Uri "$baseUrl/health" -UseBasicParsing
    $healthData = $health.Content | ConvertFrom-Json
    Write-Host "✅ PASSED: $($healthData.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
    exit
}

# Test 2: Owner Login
Write-Host "`n📊 Test 2: Owner Login (Sarah Mensah)" -ForegroundColor Yellow
try {
    $ownerLogin = Invoke-WebRequest -Method Post -Uri "$baseUrl/auth/login" `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body '{"phone":"0201234567","pin":"5678"}' -UseBasicParsing
    $ownerData = $ownerLogin.Content | ConvertFrom-Json
    $ownerToken = $ownerData.data.accessToken
    Write-Host "✅ PASSED: Logged in as $($ownerData.data.user.name) ($($ownerData.data.user.role))" -ForegroundColor Green
    Write-Host "   Warehouse: $($ownerData.data.warehouse.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
    exit
}

# Test 3: Attendant Login
Write-Host "`n📊 Test 3: Attendant Login (James Okonkwo)" -ForegroundColor Yellow
try {
    $attendantLogin = Invoke-WebRequest -Method Post -Uri "$baseUrl/auth/login" `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body '{"phone":"0241234567","pin":"1234"}' -UseBasicParsing
    $attendantData = $attendantLogin.Content | ConvertFrom-Json
    $attendantToken = $attendantData.data.accessToken
    Write-Host "✅ PASSED: Logged in as $($attendantData.data.user.name) ($($attendantData.data.user.role))" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
    exit
}

# Test 4: Owner Dashboard
Write-Host "`n📊 Test 4: Owner Dashboard" -ForegroundColor Yellow
try {
    $dashboard = Invoke-WebRequest -Method Get -Uri "$baseUrl/owner/dashboard" `
        -Headers @{ "Authorization" = "Bearer $ownerToken" } -UseBasicParsing
    $dashboardData = $dashboard.Content | ConvertFrom-Json
    Write-Host "✅ PASSED: Dashboard loaded" -ForegroundColor Green
    Write-Host "   Stock items: $($dashboardData.data.stock.Count)" -ForegroundColor Gray
    Write-Host "   Pending approvals: $($dashboardData.data.pendingApprovals.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 5: Get Stock
Write-Host "`n📊 Test 5: Get Current Stock" -ForegroundColor Yellow
try {
    $stock = Invoke-WebRequest -Method Get -Uri "$baseUrl/owner/stock" `
        -Headers @{ "Authorization" = "Bearer $ownerToken" } -UseBasicParsing
    $stockData = $stock.Content | ConvertFrom-Json
    Write-Host "✅ PASSED: Stock retrieved" -ForegroundColor Green
    if ($stockData.data.Count -eq 0) {
        Write-Host "   ⚠️  No stock yet (Genesis not recorded)" -ForegroundColor Yellow
    } else {
        foreach ($item in $stockData.data) {
            Write-Host "   - $($item.cropType): $($item.bags) bags" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 6: Attendant Home
Write-Host "`n📊 Test 6: Attendant Home Dashboard" -ForegroundColor Yellow
try {
    $attendantHome = Invoke-WebRequest -Method Get -Uri "$baseUrl/attendant/home" `
        -Headers @{ "Authorization" = "Bearer $attendantToken" } -UseBasicParsing
    $homeData = $attendantHome.Content | ConvertFrom-Json
    Write-Host "✅ PASSED: Attendant home loaded" -ForegroundColor Green
    Write-Host "   My requests: $($homeData.data.myRequests.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 7: Get Profile
Write-Host "`n📊 Test 7: Get User Profile" -ForegroundColor Yellow
try {
    $profile = Invoke-WebRequest -Method Get -Uri "$baseUrl/auth/profile" `
        -Headers @{ "Authorization" = "Bearer $ownerToken" } -UseBasicParsing
    $profileData = $profile.Content | ConvertFrom-Json
    Write-Host "✅ PASSED: Profile retrieved" -ForegroundColor Green
    Write-Host "   Name: $($profileData.data.name)" -ForegroundColor Gray
    Write-Host "   Phone: $($profileData.data.phone)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ✅ ALL TESTS COMPLETED                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📝 Available Endpoints:" -ForegroundColor Yellow
Write-Host "   Auth: /api/auth/login, /api/auth/profile, /api/auth/refresh"
Write-Host "   Owner: /api/owner/dashboard, /api/owner/stock, /api/owner/approvals, /api/owner/audit, /api/owner/genesis"
Write-Host "   Attendant: /api/attendant/home, /api/attendant/inbound, /api/attendant/requests"
Write-Host "   Admin: /api/admin/warehouses, /api/admin/users"
Write-Host "`n"
