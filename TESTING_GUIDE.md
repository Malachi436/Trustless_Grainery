# 🧪 Trustless Granary - Comprehensive Testing Guide

## ✅ System Status (All Running)

- **Backend API**: http://localhost:4000 ✅
- **Admin Dashboard**: http://localhost:3000 ✅  
- **Mobile App**: http://localhost:8081 (Expo) ✅
- **Database**: PostgreSQL on localhost:5432 ✅

---

## 📋 Pre-Test Checklist

### 1. Verify All Services Are Running
```powershell
# Check if all services are up
Get-Process node | Select-Object Id, ProcessName
netstat -ano | findstr "3000 4000 8081"
```

### 2. Test Credentials (From Seed Data)

**Platform Admin:**
- Phone: `0200000000`
- PIN: `0000`

**Owner (Warehouse 1):**
- Phone: `0201234567`
- PIN: `5678`

**Attendant (Warehouse 1):**
- Phone: `0241234567`
- PIN: `1234`

---

## 🎯 Testing Sequence

## Phase 1: Admin Dashboard Testing

### Test 1.1: Admin Login ✅
1. Open browser: http://localhost:3000
2. Should redirect to `/login`
3. Enter credentials:
   - Phone: `0200000000`
   - PIN: `0000`
4. Click "Sign In"
5. ✅ **Expected**: Redirect to `/dashboard` with system stats

### Test 1.2: Create Warehouse ✅
1. Navigate to "Manage Warehouses"
2. Click "+ New Warehouse"
3. Fill in:
   - Name: `Test Warehouse Alpha`
   - Location: `Accra, Ghana`
4. Click "Create Warehouse"
5. ✅ **Expected**: New warehouse appears with status "SETUP"

### Test 1.3: Create Owner ✅
1. Navigate to "Manage Users"
2. Click "+ New User"
3. Fill in:
   - Full Name: `John Mensah`
   - Phone: `0501234567`
   - PIN: `9999`
   - Role: `Owner`
   - Warehouse: Select "Test Warehouse Alpha"
4. Click "Create User"
5. ✅ **Expected**: New owner appears in user list

### Test 1.4: Create Attendant ✅
1. Still in "Manage Users"
2. Click "+ New User"
3. Fill in:
   - Full Name: `Mary Asante`
   - Phone: `0551234567`
   - PIN: `8888`
   - Role: `Attendant`
   - Warehouse: Select "Test Warehouse Alpha"
4. Click "Create User"
5. ✅ **Expected**: New attendant appears in user list

### Test 1.5: Initiate Genesis Event ✅
1. Navigate to "Genesis Setup"
2. Select Warehouse: `Test Warehouse Alpha`
3. Add inventory:
   - Row 1: Crop Type: `Maize`, Bags: `500`
   - Row 2: Crop Type: `Rice`, Bags: `300`
4. Add Notes: "Initial stock count verified by admin"
5. Click "Record Genesis Inventory"
6. ✅ **Expected**: 
   - Success message
   - Warehouse status changes to "GENESIS_PENDING"

### Test 1.6: View Audit Trail ✅
1. Navigate to "Audit Trail"
2. ✅ **Expected**: See all events:
   - Warehouse creation
   - User creation events
   - Genesis inventory recorded event

---

## Phase 2: Owner Mobile App Testing

### Test 2.1: Owner Login ✅
1. Open mobile app on phone/emulator
2. Select "Owner" role
3. Enter:
   - Phone: `0501234567` (John Mensah - created in Test 1.3)
   - PIN: `9999`
4. Tap "Login"
5. ✅ **Expected**: Navigate to Owner Dashboard

### Test 2.2: Confirm Genesis Inventory ✅
1. On Owner Dashboard, see "Activate Warehouse" button
2. Tap "Activate Warehouse"
3. Review genesis inventory:
   - Maize: 500 bags
   - Rice: 300 bags
4. Tap "Confirm Genesis"
5. ✅ **Expected**:
   - Warehouse becomes ACTIVE
   - Dashboard shows stock: 800 total bags
   - Button disappears

### Test 2.3: View Stock Overview ✅
1. On Owner Dashboard
2. ✅ **Expected**: See:
   - Total Bags: 800
   - Stock cards showing:
     - Maize: 500 bags
     - Rice: 300 bags

### Test 2.4: View Pending Approvals (Empty) ✅
1. Tap "Approvals" tab
2. ✅ **Expected**: "No pending approvals" message

### Test 2.5: View Audit Timeline ✅
1. Tap "Audit" tab
2. ✅ **Expected**: See chronological events:
   - Genesis Inventory Recorded
   - Genesis Confirmed

---

## Phase 3: Attendant Mobile App Testing

### Test 3.1: Attendant Login ✅
1. Logout from Owner account
2. Select "Attendant" role
3. Enter:
   - Phone: `0551234567` (Mary Asante - created in Test 1.4)
   - PIN: `8888`
4. Tap "Login"
5. ✅ **Expected**: Navigate to Attendant Dashboard

### Test 3.2: Log Inbound Stock ✅
1. Tap "Log Inbound" button
2. Fill in:
   - Crop Type: `Wheat`
   - Bags Received: `150`
   - Supplier: `ABC Farms Ltd`
   - Notes: "Delivery truck #456"
3. Take/Upload Photo (optional)
4. Tap "Record Inbound"
5. ✅ **Expected**:
   - Success message
   - Return to dashboard
   - Activity count increases

### Test 3.3: Request Dispatch ✅
1. Tap "Request Dispatch"
2. Fill in:
   - Crop Type: `Maize`
   - Bags Requested: `50`
   - Buyer Name: `XYZ Trading Co`
   - Buyer Contact: `0244567890`
   - Notes: "Urgent order"
3. Tap "Submit Request"
4. ✅ **Expected**:
   - Success message
   - Request appears in "Recent Requests" as PENDING

---

## Phase 4: Owner Approval Flow Testing

### Test 4.1: View Pending Request ✅
1. Switch back to Owner account (login as `0501234567`)
2. Go to "Approvals" tab
3. ✅ **Expected**: See pending dispatch request:
   - Maize: 50 bags
   - Buyer: XYZ Trading Co
   - Status: PENDING

### Test 4.2: Approve Dispatch Request ✅
1. Tap on the pending request
2. Review details
3. Tap "Approve" button
4. ✅ **Expected**:
   - Request status changes to APPROVED
   - Request moves from pending list

### Test 4.3: Verify Stock Update (Inbound) ✅
1. Go back to Dashboard
2. ✅ **Expected**: Stock shows:
   - Maize: 500 bags (unchanged - not dispatched yet)
   - Rice: 300 bags
   - Wheat: 150 bags (NEW from inbound)
   - **Total: 950 bags**

---

## Phase 5: Attendant Execute Dispatch Testing

### Test 5.1: View Approved Requests ✅
1. Switch to Attendant account (`0551234567`)
2. On Dashboard, see "Approved Requests" section
3. ✅ **Expected**: See the approved dispatch:
   - Maize: 50 bags
   - Status: APPROVED

### Test 5.2: Execute Dispatch ✅
1. Tap on approved request
2. Review execution details
3. Take/Upload delivery photo (optional)
4. Add notes: "Goods loaded on truck #789"
5. Tap "Complete Dispatch"
6. ✅ **Expected**:
   - Success message
   - Request status changes to EXECUTED
   - Request disappears from approved list

---

## Phase 6: Final Verification Testing

### Test 6.1: Owner Final Stock Check ✅
1. Switch to Owner account
2. View Dashboard
3. ✅ **Expected**: Updated stock:
   - Maize: **450 bags** (500 - 50 dispatched)
   - Rice: 300 bags
   - Wheat: 150 bags
   - **Total: 900 bags**

### Test 6.2: Complete Audit Trail ✅
1. On Owner app, go to "Audit" tab
2. ✅ **Expected**: See ALL events in order:
   - Genesis Inventory Recorded
   - Genesis Confirmed
   - Stock Inbound Recorded (Wheat +150)
   - Outbound Requested (Maize -50)
   - Outbound Approved (Maize -50)
   - Dispatch Executed (Maize -50)

### Test 6.3: Admin Audit Log ✅
1. Open Admin Dashboard (http://localhost:3000)
2. Navigate to "Audit Trail"
3. ✅ **Expected**: See complete system log with:
   - All warehouse events
   - All user activities
   - Color-coded event types
   - Timestamps and user info

---

## 🔍 Edge Case Testing

### Edge Test 1: Reject Dispatch Request
1. As Attendant, create another dispatch request
2. As Owner, go to Approvals
3. Tap the request
4. Tap "Reject" button
5. ✅ **Expected**: 
   - Request status: REJECTED
   - Stock unchanged
   - Event logged in audit

### Edge Test 2: Multiple Crop Types
1. As Attendant, log inbound for:
   - Sorghum: 200 bags
   - Beans: 100 bags
2. ✅ **Expected**: Dashboard shows all 5 crop types

### Edge Test 3: Empty Warehouse Check
1. Create new warehouse via Admin
2. Login as new Owner
3. ✅ **Expected**: 
   - "Activate Warehouse" button visible
   - Dashboard shows 0 bags

---

## 🚨 Known Issues & Fixes

### Issue 1: "Failed to fetch" on Admin Dashboard
**Fix**: Ensure backend is running on port 4000
```powershell
cd backend
npm run dev
```

### Issue 2: Mobile app not connecting
**Fix**: Check that frontend API config uses correct IP
- File: `frontend/src/lib/api-config.ts`
- Should auto-detect local network IP

### Issue 3: Database connection error
**Fix**: Verify PostgreSQL is running and credentials match
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*
```

---

## 📊 Success Criteria

All tests pass if:
- ✅ Admin can create warehouses and users
- ✅ Admin can initiate genesis events
- ✅ Owner can confirm genesis and activate warehouse
- ✅ Attendant can log inbound stock
- ✅ Attendant can request dispatch
- ✅ Owner can approve/reject requests
- ✅ Attendant can execute approved dispatches
- ✅ Stock calculations are accurate
- ✅ All events appear in audit trail
- ✅ No console errors in any interface

---

## 🛠️ Quick Commands

### Start All Services
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Admin Dashboard
cd admin-dashboard
npm run dev

# Terminal 3 - Mobile App
cd frontend
npx expo start
```

### Stop All Services
```powershell
taskkill /F /IM node.exe
```

### View Logs
```powershell
# Backend logs - check Terminal 1
# Admin logs - check Terminal 2
# Mobile logs - check Terminal 3 or Expo DevTools
```

---

## 📞 Test Contact

If any test fails:
1. Check console logs in browser DevTools (F12)
2. Check backend terminal for errors
3. Verify all services are running
4. Ensure database credentials are correct

**All systems are connected and ready for comprehensive testing!** 🎉
