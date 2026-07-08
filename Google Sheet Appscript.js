// ==========================================
// MATA DI FIREWORKS - BACKEND API (v2.1 - Image & Coupon Support)
// ==========================================

const INVENTORY_IMG_FOLDER_ID = '14oQ5By2spR_v9BxmtJJ_hHuirpoUlI1W'; // <-- PASTE YOUR FOLDER ID HERE

// --- MAIN GET ENDPOINT (Fetching Data) ---
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getInventory') {
      return createJsonResponse({ status: 'success', data: getSheetData('Inventory') });
    }
    if (action === 'getCoupons') {
      return createJsonResponse({ status: 'success', data: getSheetData('Coupons') });
    }
    
    return createJsonResponse({ status: 'error', message: 'Invalid or missing GET action' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// --- MAIN POST ENDPOINT (Writing Data & Auth) ---
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000); 
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // 1. LOGIN
    if (action === 'login') {
      return handleLogin(payload.userId, payload.password);
    }
    
    // 2. PROCESS SALE
    if (action === 'processSale') {
      return handleSale(payload);
    }

    // 3. UPLOAD ITEM IMAGE
    if (action === 'updateItemImage') {
      return handleImageUpload(payload.itemId, payload.imageBase64);
    }

    // 4. VALIDATE COUPON
    if (action === 'validateCoupon') {
      return handleCouponValidation(payload.code);
    }
    // 5. ADD NEW ITEM
    if (action === 'addItem') {
      return handleAddItem(payload.itemData);
    }

    // 6. DELETE ITEM
    if (action === 'deleteItem') {
      return handleDeleteItem(payload.itemName);
    }
    // 7. LOG WASTAGE
    if (action === 'logWastage') {
      return handleWastage(payload);
    }

    // 8.PROCESS CHECKOUT
    if (action === 'checkout') {
      return handleCheckout(payload);
    }

    // 9. SEARCH CUSTOMER
    if (action === 'searchCustomer') {
      return handleSearchCustomer(payload.phone);
    }

    // 10. FETCH REPORTS (Fixes the infinite loading)
    if (action === 'fetchReports' || action === 'getReports') {
      return handleFetchReports();
    }

    return createJsonResponse({ status: 'error', message: 'Invalid POST action' });

  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// CORE FUNCTIONS
// ==========================================

// Handle Authentication
function handleLogin(userId, password) {
  const users = getSheetData('Users');
  const user = users.find(u => u.UserID === userId && u.Password === password && String(u.IsActive).toUpperCase() === 'TRUE');
  
  if (user) {
    logAudit(user.FullName, "Logged in successfully.");
    return createJsonResponse({ 
      status: 'success', 
      user: { name: user.FullName, role: user.Role } 
    });
  } else {
    return createJsonResponse({ status: 'error', message: 'Invalid credentials or inactive account.' });
  }
}

// Handle Coupon Validation
function handleCouponValidation(code) {
  const coupons = getSheetData('Coupons');
  
  // Look for a matching code where Active is "Yes"
  const coupon = coupons.find(c => String(c['Coupon Code']) === String(code) && String(c['Active']).toUpperCase() === 'YES');
  
  if (coupon) {
    return createJsonResponse({
      status: 'success',
      type: coupon['Type'],
      value: coupon['Discount Value']
    });
  } else {
    return createJsonResponse({ status: 'error', message: 'Invalid or expired coupon code.' });
  }
}

// Handle Sale & Deduct Inventory
function handleSale(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName('Sales');
  const inventorySheet = ss.getSheetByName('Inventory');
  
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "ddMMyy");
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const invoiceId = `MDFM-${dateStr}-${randomChars}`;
  
  const newSaleRow = [
    invoiceId,
    new Date(),
    payload.billType || "Retail",
    payload.custName || "Walk-in",
    payload.custMobile || "",
    payload.custEmail || "",
    payload.custPincode || "",
    payload.subTotal || 0,
    payload.totalGst || 0,
    payload.totalPacking || 0,
    payload.extraChargeAmount || 0, 
    payload.extraChargeName || "", 
    payload.finalTotal || 0,
    payload.language || "EN",
    JSON.stringify(payload.cartItems) 
  ];
  
  salesSheet.appendRow(newSaleRow);

  const invData = inventorySheet.getDataRange().getValues();
  const headers = invData[0];
  const idIndex = headers.indexOf('ItemID');
  const stockIndex = headers.indexOf('TotalStock_Pieces');

  payload.cartItems.forEach(cartItem => {
    for (let i = 1; i < invData.length; i++) {
      if (String(invData[i][idIndex]) === String(cartItem.itemId)) {
        let currentStock = Number(invData[i][stockIndex]);
        inventorySheet.getRange(i + 1, stockIndex + 1).setValue(currentStock - cartItem.totalPiecesSold);
        break;
      }
    }
  });

  logAudit(payload.userName || "SYSTEM", `Generated Invoice ${invoiceId} for ₹${payload.finalTotal}`);
  return createJsonResponse({ status: 'success', invoiceId: invoiceId });
}
// Handle Adding New Inventory Items
function handleAddItem(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  
  // Creates a new row matching your exact column layout (A through I)
  const newRow = [
    data.itemName,         // A: Item Name
    data.brand,            // B: Brand
    data.piecePrice,       // C: Piece Price
    data.packPrice,        // D: Pack Price
    data.cartonPrice,      // E: Carton Price
    data.stock,            // F: Stock Quantity
    "",                    // G: Image ID (Left blank for now)
    data.wholesalePercent, // H: Wholesale %
    data.retailPercent     // I: Retail %
  ];
  
  sheet.appendRow(newRow);
  logAudit("Admin", `Added new product: ${data.itemName}`);
  
  return createJsonResponse({ status: 'success' });
}

// Handle Image Upload to Google Drive
function handleImageUpload(itemId, base64Data) {
  try {
    const folder = DriveApp.getFolderById(INVENTORY_IMG_FOLDER_ID);
    
    // Decode Base64 and save as JPEG
    const decodedImage = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedImage, MimeType.JPEG, `Item_${itemId}.jpg`);
    const newFile = folder.createFile(blob);
    
    // Make viewable so app can fetch the thumbnail
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const imageId = newFile.getId();
    
    // Update the Inventory tab
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
    const data = sheet.getDataRange().getValues();
    const idIndex = data[0].indexOf('ItemID');
    const imageIndex = data[0].indexOf('ImageID'); // Make sure you added this column!
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === String(itemId)) {
        sheet.getRange(i + 1, imageIndex + 1).setValue(imageId);
        break;
      }
    }
    
    logAudit("SYSTEM", `Updated image for Item ID: ${itemId}`);
    return createJsonResponse({ status: 'success', imageId: imageId });
    
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return []; 
  
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    let rowData = {};
    for (let j = 0; j < headers.length; j++) {
      rowData[headers[j]] = rows[i][j];
    }
    data.push(rowData);
  }
  return data;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function logAudit(userName, actionStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Audit_Log');
  if (sheet) {
    sheet.appendRow([new Date(), userName, actionStr]);
  }
}

// ==========================================
// AUTOMATED BACKUP TRIGGER
// ==========================================
function setupMonthlyBackupTrigger() {
  ScriptApp.newTrigger('createMonthlyBackup')
    .timeBased()
    .onMonthDay(1)
    .atHour(2)
    .create();
}

function createMonthlyBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMM_yyyy");
  
  const backupName = `MataDi_Backup_${dateStr}`;
  DriveApp.getFileById(ss.getId()).makeCopy(backupName);
  
  logAudit("SYSTEM", `Automated monthly backup created: ${backupName}`);
}

// ==========================================
// AUTOMATED ADD/SUBTRACT STOCK TRACKER
// ==========================================
// This creates a custom menu at the top of your Google Sheet
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📦 Mata Di Inventory')
    .addItem('Sync Stock Updates', 'processBulkStock')
    .addToUi();
}

// This is the engine that runs only when you click the menu button
function processBulkStock() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Inventory');
  const ui = SpreadsheetApp.getUi();
  
  if (!sheet) {
    ui.alert("Error: Could not find the 'Inventory' sheet.");
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return; 
  
  // Read all data at once
  const nameRange = sheet.getRange(2, 1, lastRow - 1, 1);
  const stockRange = sheet.getRange(2, 6, lastRow - 1, 1);
  const addStockRange = sheet.getRange(2, 7, lastRow - 1, 1);
  
  const nameValues = nameRange.getValues();
  const stockValues = stockRange.getValues();
  const addValues = addStockRange.getValues();
  
  let historyData = [];
  let updatedCount = 0;
  
  // Loop through and do the math
  for (let i = 0; i < addValues.length; i++) {
    let adjustmentVal = addValues[i][0];
    
    if (adjustmentVal !== "" && adjustmentVal !== null) {
      let adjustment = parseFloat(adjustmentVal);
      
      if (!isNaN(adjustment)) {
        let currentStock = parseFloat(stockValues[i][0]) || 0;
        let newStock = currentStock + adjustment;
        
        stockValues[i][0] = [newStock];
        addValues[i][0] = [""]; // Clear the Add Stock column
        
        let itemName = nameValues[i][0] || "Unknown Item";
        // Grab email if available, otherwise fallback to Admin
        let user = Session.getActiveUser().getEmail() || "Admin"; 
        
        historyData.push([new Date(), itemName, currentStock, adjustment, newStock, user]);
        updatedCount++;
      }
    }
  }
  
  // Write everything back to the sheet
  if (updatedCount > 0) {
    stockRange.setValues(stockValues);
    addStockRange.setValues(addValues);
    
    const historySheet = ss.getSheetByName('Stock_History');
    if (historySheet) {
      historySheet.getRange(historySheet.getLastRow() + 1, 1, historyData.length, 6).setValues(historyData);
    }
    
    ui.alert(`✅ Success! Updated ${updatedCount} items and logged them to History.`);
  } else {
    ui.alert("No numbers found in the 'Add Stock' column (Column G).");
  }
}

// --- UPDATED ADD ITEM (Now includes Cost Price for Profit Tracking) ---
function handleAddItem(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  const newRow = [
    data.itemName, data.brand, data.piecePrice, data.packPrice, 
    data.cartonPrice, data.stock, "", data.wholesalePercent, 
    data.retailPercent, data.costPrice // <--- Added to Column J
  ];
  sheet.appendRow(newRow);
  return createJsonResponse({ status: 'success' });
}

// --- NEW: DELETE ITEM ---
function handleDeleteItem(itemName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  const data = sheet.getDataRange().getValues();
  // Loop through to find the matching name and delete that row
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(itemName).toLowerCase()) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: 'success' });
    }
  }
  return createJsonResponse({ status: 'error', message: 'Item not found in database.' });
}

// --- NEW: LOG WASTAGE & DEDUCT INVENTORY ---
function handleWastage(payload) {
  const wasteSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Wastage');
  wasteSheet.appendRow([new Date(), payload.itemName, payload.qty, payload.reason]);
  
  // Auto-deduct from main inventory
  const invSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  const invData = invSheet.getDataRange().getValues();
  for (let i = 1; i < invData.length; i++) {
    if (String(invData[i][0]).toLowerCase() === String(payload.itemName).toLowerCase()) {
      let currentStock = Number(invData[i][5]) || 0; // Column F is index 5
      invSheet.getRange(i + 1, 6).setValue(currentStock - Number(payload.qty));
      break;
    }
  }
  return createJsonResponse({ status: 'success' });
}

function handleCheckout(data) {
  const salesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sales');
  const invSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000); 
    
    const date = new Date();
    const itemsString = data.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(', ');
    
    // The exact column mapping for your Sales tab
    salesSheet.appendRow([
      data.customerName, 
      date, 
      data.customerPhone, 
      itemsString, 
      data.salesperson, // Column E: Billed By
      "", "", "", 
      data.gst,         // Column I: Total GST
      "", "", "", 
      data.total,       // Column M: Final Total
      JSON.stringify(data) // <-- ADDED THIS: Column N (Hidden JSON Memory for Reprinting)
    ]);
    
    // Deduct Inventory
    const invData = invSheet.getDataRange().getValues();
    data.items.forEach(soldItem => {
      for (let i = 1; i < invData.length; i++) {
        let sheetItemName = String(invData[i][0] || invData[i]["Item Name"] || "").toLowerCase();
        if (sheetItemName === String(soldItem.name).toLowerCase()) {
          let currentStock = Number(invData[i][5]) || 0;
          let deduction = Number(soldItem.qty); 
          invSheet.getRange(i + 1, 6).setValue(currentStock - deduction);
          break;
        }
      }
    });
    
    return createJsonResponse({ status: 'success' });
    
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

function handleSearchCustomer(phone) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sales');
  const data = sheet.getDataRange().getValues();
  
  // Search backwards (from bottom to top) to find their most recent visit
  for (let i = data.length - 1; i > 0; i--) {
    let sheetPhone = String(data[i][2]).trim(); // Column C is Phone
    let searchPhone = String(phone).trim();
    
    if (sheetPhone === searchPhone) {
      return createJsonResponse({
        status: 'success',
        customerName: data[i][0] // Column A is Name
      });
    }
  }
  
  return createJsonResponse({ status: 'not_found' });
}

function handleFetchReports() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sales');
  if (!sheet) return createJsonResponse({ status: 'error', message: 'Sales sheet missing' });

  // Grab all sales data to send to the Analytics screen
  const data = sheet.getDataRange().getValues();
  return createJsonResponse({ status: 'success', sales: data });
}