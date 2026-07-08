[README.md](https://github.com/user-attachments/files/29788909/README.md)
# MataDiApp

[README-MataDi-v2.md](https://github.com/user-attachments/files/29787190/README-MataDi-v2.md)
# mobile-pos-inventory-app# Mata Di App 🚀

A comprehensive React Native application designed for retail and wholesale inventory management and point-of-sale operations. This application seamlessly integrates with the Google Sheets API to manage stock, process sales, and generate invoices on the fly. 

## 🌟 Key Features

*   **Dynamic Inventory Tracking:** Syncs directly with Google Sheets for real-time stock updates.
*   **Dual Pricing Models:** Effortlessly toggle between Retail and Wholesale pricing structures during checkout.
*   **Billing & Invoicing:** 
    *   Generates A4 Tax Invoices and Thermal Receipts.
    *   Supports dual language printing (English & Marathi).
    *   Automated WhatsApp receipt generation.
    *   Calculates GST (inclusive/exclusive) and applies custom discounts or coupon codes.
*   **Customer Management:** Instantly fetch previous customer details using their phone number to speed up the checkout process.
*   **Admin Dashboard:** Role-based access control. Admins can view gross revenue, total GST, add/delete inventory items, and log damaged stock.
*   **Offline Settings:** Billing preferences (Tax rates, language settings) are saved locally for a smoother user experience.

---

## 🛠️ Setup Guide for Google Sheets Backend

This repository includes a sample database and the required backend script to get you started immediately. 

### 1. Import the Database (Google Sheet)
1. Locate the **`MataDi_Sample_Sheet.xlsx`** file included in this repository.
2. Upload this file to your Google Drive.
3. Double-click the uploaded file and select **Open with Google Sheets**.
4. Go to **File > Save as Google Sheets**. (You can now delete the original `.xlsx` file from your Drive).
5. Ensure the exact tab names remain intact (`Inventory`, `Sales_History`, `Users`, `Coupons`, `Stock_History`).

### 2. Configure the Google Apps Script
1. In your newly saved Google Sheet, navigate to **Extensions > Apps Script**.
2. Open the **`GoogleAppsScript.js`** (or `.txt`) file from this repository and copy all its contents.
3. In the Apps Script editor, delete any default code in `Code.gs` and paste the copied code.
4. Click the **Save** icon.
5. Click **Deploy > New deployment**.
6. Select type **Web app**.
7. Set **Execute as:** `Me` and **Who has access:** `Anyone`.
8. Click **Deploy** and authorize the necessary permissions.
9. Copy the generated **Web App URL**.

### 3. Connect the App
1. Open the `src/api.js` file in your project.
2. Locate the `API_URL` variable at the top of the file.
3. Replace the placeholder URL with your newly generated Google Apps Script Web App URL.

```javascript
// src/api.js
const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL'; 
```

---

## 📱 How to Use the App

1.  **Login:** Users must authenticate using credentials stored in the `Users` tab of the Google Sheet. Roles determine access levels (e.g., `Admin` vs `Staff`).
2.  **Inventory Screen:** Browse items, toggle between Retail/Wholesale pricing, and add items to the cart.
3.  **Cart & Checkout:** Review the cart, apply discounts or taxes, and select the payment method. Enter customer details to complete the sale. 
4.  **Print & Share:** Generate thermal receipts via Bluetooth printers (using apps like RawBT), generate A4 PDFs, or send summaries via WhatsApp.
5.  **Admin Management:** Users with the `Admin` role can access the management screens to add new products, delete obsolete items, or log wastage.

---

## ⚠️ Licensing & Usage

**All Rights Reserved.**

This software is provided for portfolio demonstration and personal use only. It is **not** licensed for commercial use, redistribution, or modification by third parties. 

If you are interested in utilizing this application for your business or require a customized enterprise solution, please contact the developer to discuss licensing options.

*Refer to the `SUPPORT.md` file for contact information.*
