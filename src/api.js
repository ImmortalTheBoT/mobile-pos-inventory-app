// src/api.js
const API_URL = 'https://script.google.com/macros/s/AKfycbw-GVJEiieNNYmIzELVa6CvPy6yrJUS9sq6TOwds8EmJMvSiJj8w1/exec'; // <-- PASTE URL HERE

export const loginUser = async (userId, password) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', userId, password })
    });
    return await response.json();
  } catch (error) {
    console.error("Login Error:", error);
    return { status: 'error', message: 'Network request failed' };
  }
};

export const fetchInventory = async () => {
  try {
    const response = await fetch(`${API_URL}?action=getInventory`);
    return await response.json();
  } catch (error) {
    console.error("Fetch Inventory Error:", error);
    return { status: 'error', message: 'Network request failed' };
  }
};

export const processSale = async (salePayload) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'processSale', ...salePayload })
    });
    return await response.json();
  } catch (error) {
    console.error("Sale Error:", error);
    return { status: 'error', message: 'Network request failed' };
  }
};

export const uploadItemImage = async (itemId, base64String) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'updateItemImage', itemId, imageBase64: base64String })
    });
    return await response.json();
  } catch (error) {
    console.error("Image Upload Error:", error);
    return { status: 'error', message: 'Network request failed' };
  }
};

export const validateCoupon = async (code) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'validateCoupon', code })
    });
    return await response.json();
  } catch (error) {
    return { status: 'error', message: 'Network error' };
  }
};

export const addItemToSheet = async (itemData) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addItem', itemData })
    });
    return await response.json();
  } catch (error) {
    return { status: 'error', message: 'Network error' };
  }
};

export const deleteItemFromSheet = async (itemName) => {
  try {
    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteItem', itemName }) });
    return await response.json();
  } catch (error) { return { status: 'error' }; }
};

export const logWastageToSheet = async (wasteData) => {
  try {
    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'logWastage', ...wasteData }) });
    return await response.json();
  } catch (error) { return { status: 'error' }; }
};

export const checkoutCart = async (orderData) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'checkout', ...orderData })
    });
    return await response.json();
  } catch (error) {
    console.error("Checkout Error:", error);
    return { status: 'error', message: 'Network error' };
  }
};

export const searchCustomerData = async (phone) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'searchCustomer', phone })
    });
    return await response.json();
  } catch (error) {
    return { status: 'error' };
  }
};

export const fetchReportsData = async () => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'fetchReports' }) // This matches the Apps Script we just added!
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching reports:", error);
    return { status: 'error', sales: [] };
  }
};