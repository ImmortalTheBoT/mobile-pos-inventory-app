import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Linking, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNPrint from 'react-native-print';
import { checkoutCart, validateCoupon, searchCustomerData } from '../api'; 

export default function CartScreen({ route, navigation }) {
  const { cartItems } = route.params || {};
  const [cart, setCart] = useState(cartItems || []);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [salesperson, setSalesperson] = useState('Admin');
  
  const [isWholesale, setIsWholesale] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [applyCustomDiscount, setApplyCustomDiscount] = useState(false);
  const [customDiscountVal, setCustomDiscountVal] = useState('');
  
  // Settings (Will be loaded from memory)
  const [applyTax, setApplyTax] = useState(true);
  const [taxRateVal, setTaxRateVal] = useState('18');
  const [isInclusive, setIsInclusive] = useState(false); 
  const [isMarathiInvoice, setIsMarathiInvoice] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const storedData = await AsyncStorage.getItem('userData');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed.userId) setSalesperson(parsed.userId);
        }
        // LOAD SAVED SETTINGS
        const savedSettings = await AsyncStorage.getItem('billingSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setApplyTax(parsedSettings.applyTax ?? true);
          setTaxRateVal(parsedSettings.taxRateVal ?? '18');
          setIsInclusive(parsedSettings.isInclusive ?? false);
          setIsMarathiInvoice(parsedSettings.isMarathiInvoice ?? false);
        }
      } catch (error) {}
    };
    fetchInitialData();
  }, []);

  const saveSettingsAndClose = async () => {
    setShowSettings(false);
    try {
      await AsyncStorage.setItem('billingSettings', JSON.stringify({
        applyTax, taxRateVal, isInclusive, isMarathiInvoice
      }));
    } catch (e) {}
  };

  const getItemName = (item) => item[0] || item["Item Name"] || item.name || item.itemName || "Unknown Item";

  const getCalculatedPrice = (item, type) => {
    if (!item) return 0;
    let baseCost = 0;
    if (type === 'Piece') baseCost = parseFloat(item[2] || item["Piece Price"]) || 0;
    if (type === 'Pack') baseCost = parseFloat(item[3] || item["Pack Price"]) || 0;
    if (type === 'Carton') baseCost = parseFloat(item[4] || item["Carton Price"]) || 0;
    let wholesaleMarkup = parseFloat(item[7] || item["Wholesale %"]) || 0;
    let retailMarkup = parseFloat(item[8] || item["Retail %"]) || 0;
    return isWholesale ? baseCost + (baseCost * (wholesaleMarkup / 100)) : baseCost + (baseCost * (retailMarkup / 100));
  };

  let rawSubtotal = 0;
  cart.forEach(item => { rawSubtotal += getCalculatedPrice(item, item.sellUnit) * item.sellQuantity; });
  
  let finalDiscountPercent = couponDiscountPercent;
  if (applyCustomDiscount) finalDiscountPercent = parseFloat(customDiscountVal) || 0;
  const discountAmount = rawSubtotal * (finalDiscountPercent / 100);
  const afterDiscount = rawSubtotal - discountAmount;
  
  let finalTaxAmt = 0;
  let grandTotal = 0;
  let taxRateNum = applyTax ? (parseFloat(taxRateVal) || 0) : 0;

  if (isInclusive) {
    grandTotal = afterDiscount;
    finalTaxAmt = grandTotal - (grandTotal / (1 + (taxRateNum / 100)));
  } else {
    finalTaxAmt = afterDiscount * (taxRateNum / 100);
    grandTotal = afterDiscount + finalTaxAmt;
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsValidating(true);
    const res = await validateCoupon(couponCode);
    setIsValidating(false);
    if (res.status === 'success' && res.discount > 0) {
      setCouponDiscountPercent(res.discount);
      setApplyCustomDiscount(false); 
      Alert.alert('Success', `${res.discount}% Coupon Applied!`);
    } else {
      setCouponDiscountPercent(0);
      Alert.alert('Invalid', 'Coupon code is invalid or expired.');
    }
  };

  const handleCustomerSearch = async () => {
    if (customerPhone.length < 10) {
      Alert.alert("Invalid Number", "Please enter a 10-digit phone number first.");
      return;
    }
    setIsSearchingCustomer(true);
    const res = await searchCustomerData(customerPhone);
    setIsSearchingCustomer(false);
    
    if (res.status === 'success') {
      setCustomerName(res.customerName);
      // Optional nice touch:
      // Alert.alert("Customer Found!", `Welcome back, ${res.customerName}`);
    } else {
      Alert.alert("Not Found", "No previous customer found with this number. Please type their name manually.");
    }
  };

  const printThermalFromCart = async (order, isMarathi) => {
    if (!order) return;

    // --- THE BILINGUAL DICTIONARY ---
    const labels = {
      storeName: isMarathi ? "माता दी फटाका मार्ट" : "MATA DI FATAKA MART",
      address: isMarathi ? "सर्व्हे नं. १-१४, गोदरेज मेन रोड जवळ, केशवनगर, पुणे, ४११०३६" : "Survey No. 1-14, Near Godrej Main Road, Keshavnagar, Pune, 411036",
      phone: isMarathi ? "संपर्क:" : "Phone:",
      invoice: isMarathi ? "बिल क्र:" : "Invoice No:",
      date: isMarathi ? "दिनांक:" : "Date:",
      customer: isMarathi ? "ग्राहक:" : "Customer:",
      custPhone: isMarathi ? "फोन:" : "Phone:",
      itemHeader: isMarathi ? "तपशील" : "Item",
      qtyHeader: isMarathi ? "नग" : "Qty",
      totalHeader: isMarathi ? "एकूण" : "Total",
      discount: isMarathi ? "सवलत:" : "Discount:",
      gst: isMarathi ? "जीएसटी:" : "GST:",
      finalTotal: isMarathi ? "अंतिम रक्कम:" : "Total:",
      footer: isMarathi ? "धन्यवाद! पुन्हा भेट द्या." : "Thank You! Visit Again."
    };

    const itemsHTML = order.items.map(item => `
      <tr>
        <td>${item.name}<br><small>${item.qty} ${item.unit} x ₹${parseFloat(item.price).toFixed(2)}</small></td>
        <td class="right">₹${(item.qty * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
      <head>
        <meta charset="UTF-8"> 
        <style>
          body { font-family: monospace; width: 300px; margin: 0 auto; padding: 10px; color: #000; }
          h2, h3, p { margin: 2px 0; text-align: center; }
          .small { font-size: 12px; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          th, td { text-align: left; font-size: 12px; padding: 2px 0; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>${labels.storeName}</h2>
        <p class="small">${labels.address}</p>
        <p class="small">${labels.phone} 8788083007 / 9822010393</p>
        <div class="line"></div>
        
        <p class="small bold">${labels.invoice} ${order.invoiceNo}</p>
        <p class="small">${labels.date} ${new Date().toLocaleString()}</p>
        <p class="small">${labels.customer} ${order.customerName}</p>
        <p class="small">${labels.custPhone} ${order.customerPhone}</p>
        
        <div class="line"></div>
        <table>
          <tr><th>${labels.itemHeader}</th><th class="right">${labels.totalHeader}</th></tr>
          ${itemsHTML}
        </table>
        <div class="line"></div>
        ${order.discount > 0 ? `<p class="small right">${labels.discount} -₹${parseFloat(order.discount).toFixed(2)}</p>` : ''}
        ${order.gst > 0 ? `<p class="small right">${labels.gst} +₹${parseFloat(order.gst).toFixed(2)}</p>` : ''}
        <h3 class="right" style="margin: 5px 0;">${labels.finalTotal} ₹${parseFloat(order.total).toFixed(2)}</h3>
        <div class="line"></div>
        <p class="small bold">${labels.footer}</p>
      </body>
      </html>
    `;

    try {
      await RNPrint.print({ html });
    } catch (error) {
      console.log("Thermal Print Error:", error);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!customerName || customerPhone.length < 10) {
      Alert.alert("Customer Details", "Please enter a Name and a valid 10-digit Phone Number."); 
      return;
    }
    
    setIsCheckingOut(true);

    try {
      // 1. THIS IS THE LINE WE WERE MISSING! It generates the number first.
      const generatedInvoiceNo = "INV-" + Math.floor(100000 + Math.random() * 900000);

      const orderData = {
        invoiceNo: generatedInvoiceNo, // Now the app knows exactly what this is!
        customerName, 
        customerPhone, 
        salesperson,
        items: cart.map(item => ({ 
          name: getItemName(item), 
          qty: item.sellQuantity, 
          unit: item.sellUnit, 
          price: getCalculatedPrice(item, item.sellUnit) 
        })),
        subtotal: rawSubtotal, 
        discount: discountAmount, 
        gst: finalTaxAmt, 
        total: grandTotal
      };
      
      const response = await checkoutCart(orderData);
      
      // We got a response, turn off the spinner!
      setIsCheckingOut(false);
      
      if (response && response.status === 'success') { 
        setLastOrder(orderData);
        setShowSuccess(true); 
      } else { 
        Alert.alert("Checkout Failed", response?.message || "Google Sheet rejected the data."); 
      }

    } catch (error) {
      // If anything crashes, this catches it and turns the spinner off!
      setIsCheckingOut(false);
      Alert.alert("App Error", "Something went wrong: " + error.message);
    }
  };

  const generatePDFHTML = (order) => {
    let rows = cart.map(item => `<tr><td>${getItemName(item)}</td><td>${item.sellQuantity} ${item.sellUnit}</td><td>₹${getCalculatedPrice(item, item.sellUnit).toFixed(2)}</td><td>₹${(getCalculatedPrice(item, item.sellUnit) * item.sellQuantity).toFixed(2)}</td></tr>`).join('');
    
    if (isMarathiInvoice) {
      let totalsHTML = `<p>एकूण रक्कम (Subtotal): ₹${rawSubtotal.toFixed(2)}</p>`;
      if (finalDiscountPercent > 0) totalsHTML += `<p style="color:green;">सवलत / Discount (${finalDiscountPercent}%): -₹${discountAmount.toFixed(2)}</p>`;
      if (applyTax) {
        if (isInclusive) totalsHTML += `<p style="font-size:12px; color:#666;">(जीएसटी / GST ${taxRateNum}% समाविष्ट: ₹${finalTaxAmt.toFixed(2)})</p>`;
        else totalsHTML += `<p>जीएसटी / GST (${taxRateNum}%): +₹${finalTaxAmt.toFixed(2)}</p>`;
      }
      totalsHTML += `<p class="grand-total">अंतिम रक्कम (Grand Total): ₹${grandTotal.toFixed(2)}</p>`;
      return `<html><head><style>body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; } .header { text-align: center; border-bottom: 3px solid #d32f2f; padding-bottom: 15px; margin-bottom: 20px; } h1 { color: #d32f2f; margin: 0; font-size: 34px; } p.store-info { margin: 5px 0; color: #555; font-size: 15px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; } th { background-color: #f5f5f5; } .totals { margin-top: 20px; text-align: right; font-size: 16px; } .totals p { margin: 5px 0; } .grand-total { font-size: 22px; font-weight: bold; color: #d32f2f; margin-top: 10px; border-top: 2px solid #ccc; padding-top: 10px;}</style></head><body><div class="header"><h1>माता दी फटाका मार्ट</h1><p class="store-info">पत्ता: सर्व्हे नं. १-१४, गोदरेज मेन रोड जवळ, केशवनगर, पुणे, ४११०३६</p><p class="store-info"> संपर्क: ८७८८०८३००७ / ९८२२०१०३९३ | ईमेल: rpradhan550@gmail.com</p><h3 style="color: #333; margin-top: 15px;">अधिकृत कर पावती (Tax Invoice)</h3></div><p><strong>ग्राहकाचे नाव (Billed To):</strong> ${customerName}</p><p><strong>मोबाईल क्र. (Phone):</strong> +91 ${customerPhone}</p>${customerEmail ? `<p><strong>ईमेल (Email):</strong> ${customerEmail}</p>` : ''}<p><strong>विक्रेता (Billed By):</strong> ${salesperson}</p><p><strong>बिल क्र. (Invoice No):</strong> ${order.invoiceNo}</p><p><strong>दिनांक (Date):</strong> ${new Date().toLocaleString()}</p><table><tr><th>तपशील (Item)</th><th>नग (Qty)</th><th>दर (Price)</th><th>एकूण (Total)</th></tr>${rows}</table><div class="totals">${totalsHTML}</div></body></html>`;
    } else {
      let totalsHTML = `<p>Subtotal: ₹${rawSubtotal.toFixed(2)}</p>`;
      if (finalDiscountPercent > 0) totalsHTML += `<p style="color:green;">Discount (${finalDiscountPercent}%): -₹${discountAmount.toFixed(2)}</p>`;
      if (applyTax) {
        if (isInclusive) totalsHTML += `<p style="font-size:12px; color:#666;">(Includes ${taxRateNum}% GST: ₹${finalTaxAmt.toFixed(2)})</p>`;
        else totalsHTML += `<p>GST (${taxRateNum}%): +₹${finalTaxAmt.toFixed(2)}</p>`;
      }
      totalsHTML += `<p class="grand-total">Grand Total: ₹${grandTotal.toFixed(2)}</p>`;
      return `<html><head><style>body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; } .header { text-align: center; border-bottom: 3px solid #d32f2f; padding-bottom: 15px; margin-bottom: 20px; } h1 { color: #d32f2f; margin: 0; font-size: 32px; text-transform: uppercase; } p.store-info { margin: 5px 0; color: #555; font-size: 14px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; } th { background-color: #f5f5f5; text-transform: uppercase; } .totals { margin-top: 20px; text-align: right; font-size: 16px; } .totals p { margin: 5px 0; } .grand-total { font-size: 22px; font-weight: bold; color: #d32f2f; margin-top: 10px; border-top: 2px solid #ccc; padding-top: 10px;}</style></head><body><div class="header"><h1>Mata Di Fataka Mart</h1><p class="store-info">Survey No. 1-14, Near Godrej Main Road, Keshavnagar, Pune, 411036</p><p class="store-info">Phone: 8788083007 / 9822010393 | Email: rpradhan550@gmail.com</p><h3 style="color: #333; margin-top: 15px; text-transform: uppercase;">Official Tax Invoice</h3></div><p><strong>Billed To:</strong> ${customerName}</p><p><strong>Phone:</strong> +91 ${customerPhone}</p>${customerEmail ? `<p><strong>Email:</strong> ${customerEmail}</p>` : ''}<p><strong>Billed By:</strong> ${salesperson}</p><p><strong>Invoice No:</strong> ${order.invoiceNo}</p><p><strong>Date:</strong> ${new Date().toLocaleString()}</p><table><tr><th>Item Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>${rows}</table><div class="totals">${totalsHTML}</div></body></html>`;
    }
  };

  const generateAndPrintPDF = async () => {
    try { await RNPrint.print({ html: generatePDFHTML(lastOrder) }); } 
    catch (error) { Alert.alert('Print Error', error.message || 'Failed to print.'); }
  };

  const sendWhatsAppReceipt = () => {
    let text = `Hello ${customerName}!\n\nThank you for shopping at *Mata Di Fataka Mart* 🎆.\n\nHere is your bill summary:\nSubtotal: ₹${rawSubtotal.toFixed(2)}\n`;
    if (finalDiscountPercent > 0) text += `Discount: -₹${discountAmount.toFixed(2)}\n`;
    if (applyTax) {
      if (isInclusive) text += `(Includes ${taxRateNum}% GST: ₹${finalTaxAmt.toFixed(2)})\n`;
      else text += `GST (${taxRateNum}%): ₹${finalTaxAmt.toFixed(2)}\n`;
    }
    text += `*Grand Total: ₹${grandTotal.toFixed(2)}*\n\nWe look forward to seeing you again!`;
    Linking.openURL(`whatsapp://send?phone=91${customerPhone}&text=${encodeURIComponent(text)}`).catch(() => Alert.alert('Error', 'WhatsApp is not installed.'));
  };

  const removeItem = (index) => {
    const newCart = [...cart]; newCart.splice(index, 1); setCart(newCart);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Checkout</Text>
        <TouchableOpacity style={styles.settingsIcon} onPress={() => setShowSettings(true)}><Text style={{fontSize:24}}>⚙️</Text></TouchableOpacity>
      </View>

      <View style={styles.customerBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TextInput 
            style={[styles.input, { flex: 1, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]} 
            placeholder="Phone Number (10 Digits)" 
            keyboardType="numeric" 
            placeholderTextColor="#999" 
            color="#000" 
            value={customerPhone} 
            onChangeText={setCustomerPhone} 
          />
          <TouchableOpacity 
            style={{ backgroundColor: '#333', padding: 13, borderTopRightRadius: 8, borderBottomRightRadius: 8, justifyContent: 'center' }} 
            onPress={handleCustomerSearch}
            disabled={isSearchingCustomer}
          >
            {isSearchingCustomer ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔍 Search</Text>}
          </TouchableOpacity>
        </View>

        <TextInput 
          style={styles.input} 
          placeholder="Customer Name" 
          placeholderTextColor="#999" 
          color="#000" 
          value={customerName} 
          onChangeText={setCustomerName} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Email Address (Optional)" 
          keyboardType="email-address"
          placeholderTextColor="#999" 
          color="#000" 
          value={customerEmail} 
          onChangeText={setCustomerEmail} 
        />
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Mode:</Text>
          <TouchableOpacity style={[styles.toggleBtn, !isWholesale && styles.toggleActive]} onPress={() => setIsWholesale(false)}><Text style={[styles.toggleBtnText, !isWholesale && styles.toggleActiveText]}>Retail</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, isWholesale && styles.toggleActive]} onPress={() => setIsWholesale(true)}><Text style={[styles.toggleBtnText, isWholesale && styles.toggleActiveText]}>Wholesale</Text></TouchableOpacity>
        </View>
      </View>

      <FlatList 
        data={cart}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.cartItem}>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName}>{getItemName(item)}</Text>
              <Text style={styles.cartItemDetails}>{item.sellQuantity} {item.sellUnit} x ₹{getCalculatedPrice(item, item.sellUnit).toFixed(2)}</Text>
            </View>
            <Text style={styles.cartItemTotal}>₹{(getCalculatedPrice(item, item.sellUnit) * item.sellQuantity).toFixed(2)}</Text>
            <TouchableOpacity onPress={() => removeItem(index)} style={styles.deleteBtn}><Text style={styles.deleteBtnText}>X</Text></TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 10 }}
      />

      <View style={styles.checkoutFooter}>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal:</Text><Text style={styles.summaryValue}>₹{rawSubtotal.toFixed(2)}</Text></View>
        {finalDiscountPercent > 0 && <View style={styles.summaryRow}><Text style={[styles.summaryLabel, {color: 'green'}]}>Discount ({finalDiscountPercent}%):</Text><Text style={[styles.summaryValue, {color: 'green'}]}>-₹{discountAmount.toFixed(2)}</Text></View>}
        {applyTax && (
           <View style={styles.summaryRow}>
             <Text style={styles.summaryLabel}>{isInclusive ? `Includes GST (${taxRateVal}%)` : `GST (${taxRateVal}%)`}:</Text>
             <Text style={styles.summaryValue}>{isInclusive ? `(₹${finalTaxAmt.toFixed(2)})` : `+₹${finalTaxAmt.toFixed(2)}`}</Text>
           </View>
        )}
        <View style={[styles.summaryRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }]}>
          <Text style={styles.totalLabel}>Grand Total:</Text>
          <Text style={styles.totalAmount}>₹{grandTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} disabled={isCheckingOut || cart.length === 0}>
          {isCheckingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnText}>Confirm Order & Bill</Text>}
        </TouchableOpacity>
      </View>

      {/* BILLING SETTINGS MODAL */}
      <Modal visible={showSettings} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.settingsBox}>
            <Text style={styles.settingsTitle}>Billing Settings</Text>
            <ScrollView>
              <View style={[styles.settingSection, {backgroundColor: '#e3f2fd', borderColor: '#2196f3'}]}>
                <View style={styles.settingHeader}>
                  <Text style={[styles.settingLabel, {color: '#1565c0'}]}>Print Invoice in Marathi</Text>
                  <Switch value={isMarathiInvoice} onValueChange={setIsMarathiInvoice} />
                </View>
              </View>

              <View style={styles.settingSection}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingLabel}>Apply Custom Discount</Text>
                  <Switch value={applyCustomDiscount} onValueChange={setApplyCustomDiscount} />
                </View>
                {applyCustomDiscount && (
                  <TextInput style={styles.settingsInput} placeholder="Discount Percentage (e.g. 10)" keyboardType="numeric" placeholderTextColor="#999" color="#000" value={customDiscountVal} onChangeText={setCustomDiscountVal} />
                )}
              </View>

              {!applyCustomDiscount && (
                <View style={styles.settingSection}>
                  <Text style={styles.settingLabel}>Or Apply Coupon Code</Text>
                  <View style={{flexDirection:'row', marginTop: 10}}>
                    <TextInput style={[styles.settingsInput, {flex: 1, marginBottom: 0}]} placeholder="Enter Code" placeholderTextColor="#999" color="#000" value={couponCode} onChangeText={setCouponCode} />
                    <TouchableOpacity style={styles.couponBtn} onPress={handleApplyCoupon}><Text style={{color:'#fff'}}>Apply</Text></TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.settingSection}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingLabel}>Apply Tax (GST)</Text>
                  <Switch value={applyTax} onValueChange={setApplyTax} />
                </View>
                {applyTax && (
                  <View>
                    <Text style={{color:'#666', marginTop: 10}}>Tax Rate (%)</Text>
                    <TextInput style={styles.settingsInput} keyboardType="numeric" placeholderTextColor="#999" color="#000" value={taxRateVal} onChangeText={setTaxRateVal} />
                    <View style={styles.settingHeader}>
                      <Text style={{color:'#333', fontWeight: 'bold'}}>Tax is Inclusive?</Text>
                      <Switch value={isInclusive} onValueChange={setIsInclusive} />
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.closeSettingsBtn} onPress={saveSettingsAndClose}><Text style={styles.actionBtnText}>Save & Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccess} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Order Confirmed!</Text>
            <Text style={styles.successSub}>₹{grandTotal.toFixed(2)}</Text>
            
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#2e7d32'}]} onPress={sendWhatsAppReceipt}>
              <Text style={styles.actionBtnText}>💬 Send WhatsApp Receipt</Text>
            </TouchableOpacity>

            {/* DUAL PRINT BUTTONS */}
            <View style={{ flexDirection: 'row', width: '100%', marginTop: 5, marginBottom: 5 }}>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#1976d2', flex: 1, marginRight: 5, marginTop: 0}]} onPress={generateAndPrintPDF}>
                <Text style={styles.actionBtnText}>📄 A4 Bill</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#424242', flex: 1, marginLeft: 5, marginTop: 0}]} onPress={() => printThermalFromCart(lastOrder, isMarathiInvoice)}>
                <Text style={styles.actionBtnText}>🖨️ Thermal</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#333', marginTop: 15}]} onPress={() => navigation.navigate('Main')}>
              <Text style={styles.actionBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', elevation: 2, alignItems: 'center' },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  settingsIcon: { padding: 5 },
  customerBox: { padding: 15, backgroundColor: '#fff', marginBottom: 10, elevation: 1 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 16, backgroundColor: '#fafafa' },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginRight: 15 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', marginRight: 10 },
  toggleActive: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  toggleBtnText: { color: '#666', fontWeight: 'bold' },
  toggleActiveText: { color: '#fff' },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginHorizontal: 10, marginBottom: 8, borderRadius: 8, alignItems: 'center', elevation: 1 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  cartItemDetails: { fontSize: 14, color: '#666', marginTop: 4 },
  cartItemTotal: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginRight: 15 },
  deleteBtn: { backgroundColor: '#ffebee', padding: 10, borderRadius: 8 },
  deleteBtnText: { color: '#d32f2f', fontWeight: 'bold' },
  checkoutFooter: { padding: 15, backgroundColor: '#fff', elevation: 10, borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  totalLabel: { fontSize: 18, color: '#333', fontWeight: 'bold' },
  totalAmount: { fontSize: 24, color: '#d32f2f', fontWeight: 'bold' },
  checkoutBtn: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  checkoutBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  successBox: { backgroundColor: '#fff', padding: 25, borderRadius: 15, alignItems: 'center' },
  successIcon: { fontSize: 50, marginBottom: 10 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  successSub: { fontSize: 20, color: '#2e7d32', fontWeight: 'bold', marginBottom: 25 },
  actionBtn: { width: '100%', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  settingsBox: { backgroundColor: '#fff', padding: 20, borderRadius: 15, maxHeight: '80%', width: '100%' },
  settingsTitle: { fontSize: 22, fontWeight: 'bold', color: '#d32f2f', marginBottom: 20, textAlign: 'center', borderBottomWidth: 1, paddingBottom: 10, borderColor: '#eee' },
  settingSection: { marginBottom: 25, backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  settingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  settingLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  settingsInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff', marginTop: 5 },
  couponBtn: { backgroundColor: '#333', paddingHorizontal: 15, justifyContent: 'center', borderRadius: 8, marginLeft: 10 },
  closeSettingsBtn: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 }
});