import RNPrint from 'react-native-print';
import { Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchReportsData } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function ReportsScreen() {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('Today'); // 'Today', 'Week', 'Month', 'All', 'Custom'

  // Custom Date States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('start'); // 'start' or 'end'

  // Metrics States
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalGST, setTotalGST] = useState(0);
  const [totalBills, setTotalBills] = useState(0);
  // --- NEW SECURITY CHECK ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- BULLETPROOF SECURITY CHECK ---
  const checkUserRole = async () => {
    try {
      const currentUser = await AsyncStorage.getItem('userRole'); 
      // .trim().toLowerCase() safely ignores accidental spaces and capitals!
      if (currentUser && currentUser.trim().toLowerCase() === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.log("Error checking role", error);
    }
  };

  useEffect(() => { 
    checkUserRole(); 
    loadData(); 
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await checkUserRole();
    try {
      const response = await fetchReportsData();
      if (response && response.status === 'success') {
        setSales(response.sales || []);
      } else {
        setSales([]); // If no data, show empty list instead of crashing
      }
    } catch (error) {
      console.log("Failed to load data:", error);
      setSales([]);
    } finally {
      setIsLoading(false); // This GUARANTEES the spinner stops!
    }
  };

  useEffect(() => { calculateMetrics(); }, [sales, filter, startDate, endDate]);

  const calculateMetrics = () => {
    let revenue = 0; let gst = 0; let bills = 0;
    const now = new Date();
    
    // Normalize dates for custom range to compare accurately
    const startObj = new Date(startDate); startObj.setHours(0,0,0,0);
    const endObj = new Date(endDate); endObj.setHours(23,59,59,999);

    sales.forEach(sale => {
      const saleDateStr = sale["Date"] || sale[1]; 
      if (!saleDateStr) return;
      
      const saleDate = new Date(saleDateStr);
      let includeInFilter = false;

      if (filter === 'All') includeInFilter = true;
      else if (filter === 'Today') includeInFilter = saleDate.toDateString() === now.toDateString();
      else if (filter === 'Week') {
        const diffTime = Math.abs(now - saleDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        includeInFilter = diffDays <= 7;
      }
      else if (filter === 'Month') {
        includeInFilter = saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      else if (filter === 'Custom') {
        includeInFilter = saleDate >= startObj && saleDate <= endObj;
      }

      if (includeInFilter) {
        revenue += parseFloat(sale["Final Total"] || sale["finalTotal"] || sale[12] || 0);
        gst += parseFloat(sale["Total GST"] || sale["totalGst"] || sale[8] || 0);
        bills += 1;
      }
    });

    setTotalRevenue(revenue); setTotalGST(gst); setTotalBills(bills);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      if (pickerMode === 'start') setStartDate(selectedDate);
      else setEndDate(selectedDate);
      setFilter('Custom'); // Automatically switch to custom filter
    }
  };

  const openPicker = (mode) => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const FilterButton = ({ title }) => (
    <TouchableOpacity style={[styles.filterBtn, filter === title && styles.filterBtnActive]} onPress={() => setFilter(title)}>
      <Text style={[styles.filterText, filter === title && styles.filterTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const generateA4HTML = (billData, isMarathi) => {
    let rows = billData.items.map(item => `<tr><td>${item.name}</td><td>${item.qty} ${item.unit}</td><td>₹${parseFloat(item.price).toFixed(2)}</td><td>₹${(item.qty * item.price).toFixed(2)}</td></tr>`).join('');
    
    let subtotal = parseFloat(billData.subtotal || 0).toFixed(2);
    let discount = parseFloat(billData.discount || 0).toFixed(2);
    let gst = parseFloat(billData.gst || 0).toFixed(2);
    let total = parseFloat(billData.total || 0).toFixed(2);

    if (isMarathi) {
      let totalsHTML = `<p>एकूण रक्कम (Subtotal): ₹${subtotal}</p>`;
      if (discount > 0) totalsHTML += `<p style="color:green;">सवलत / Discount: -₹${discount}</p>`;
      if (gst > 0) totalsHTML += `<p>जीएसटी / GST: +₹${gst}</p>`;
      totalsHTML += `<p class="grand-total">अंतिम रक्कम (Grand Total): ₹${total}</p>`;

      return `<html><head><style>body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; } .header { text-align: center; border-bottom: 3px solid #d32f2f; padding-bottom: 15px; margin-bottom: 20px; } h1 { color: #d32f2f; margin: 0; font-size: 34px; } p.store-info { margin: 5px 0; color: #555; font-size: 15px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; } th { background-color: #f5f5f5; } .totals { margin-top: 20px; text-align: right; font-size: 16px; } .totals p { margin: 5px 0; } .grand-total { font-size: 22px; font-weight: bold; color: #d32f2f; margin-top: 10px; border-top: 2px solid #ccc; padding-top: 10px;}</style></head><body><div class="header"><h1>माता दी फटाका मार्ट</h1><p class="store-info">पत्ता: सर्व्हे नं. १-१४, गोदरेज मेन रोड जवळ, केशवनगर, पुणे, ४११०३६</p><p class="store-info"> संपर्क: ८७८८०८३००७ / ९८२२०१०३९३ | ईमेल: rpradhan550@gmail.com</p><h3 style="color: #333; margin-top: 15px;">अधिकृत कर पावती (Tax Invoice)</h3></div><p><strong>ग्राहकाचे नाव (Billed To):</strong> ${billData.customerName || 'Walk-in'}</p><p><strong>मोबाईल क्र. (Phone):</strong> +91 ${billData.customerPhone || 'N/A'}</p><p><strong>विक्रेता (Billed By):</strong> ${billData.salesperson || 'Admin'}</p><p><strong>बिल क्र. (Invoice No):</strong> ${billData.invoiceNo || 'N/A'}</p><p><strong>दिनांक (Date):</strong> ${new Date().toLocaleString()}</p><table><tr><th>तपशील (Item)</th><th>नग (Qty)</th><th>दर (Price)</th><th>एकूण (Total)</th></tr>${rows}</table><div class="totals">${totalsHTML}</div></body></html>`;
    } else {
      let totalsHTML = `<p>Subtotal: ₹${subtotal}</p>`;
      if (discount > 0) totalsHTML += `<p style="color:green;">Discount: -₹${discount}</p>`;
      if (gst > 0) totalsHTML += `<p>GST: +₹${gst}</p>`;
      totalsHTML += `<p class="grand-total">Grand Total: ₹${total}</p>`;

      return `<html><head><style>body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; } .header { text-align: center; border-bottom: 3px solid #d32f2f; padding-bottom: 15px; margin-bottom: 20px; } h1 { color: #d32f2f; margin: 0; font-size: 32px; text-transform: uppercase; } p.store-info { margin: 5px 0; color: #555; font-size: 14px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; } th { background-color: #f5f5f5; text-transform: uppercase; } .totals { margin-top: 20px; text-align: right; font-size: 16px; } .totals p { margin: 5px 0; } .grand-total { font-size: 22px; font-weight: bold; color: #d32f2f; margin-top: 10px; border-top: 2px solid #ccc; padding-top: 10px;}</style></head><body><div class="header"><h1>Mata Di Fataka Mart</h1><p class="store-info">Survey No. 1-14, Near Godrej Main Road, Keshavnagar, Pune, 411036</p><p class="store-info">Phone: 8788083007 / 9822010393 | Email: rpradhan550@gmail.com</p><h3 style="color: #333; margin-top: 15px; text-transform: uppercase;">Official Tax Invoice</h3></div><p><strong>Billed To:</strong> ${billData.customerName || 'Walk-in'}</p><p><strong>Phone:</strong> +91 ${billData.customerPhone || 'N/A'}</p><p><strong>Billed By:</strong> ${billData.salesperson || 'Admin'}</p><p><strong>Invoice No:</strong> ${billData.invoiceNo || 'N/A'}</p><p><strong>Date:</strong> ${new Date().toLocaleString()}</p><table><tr><th>Item Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>${rows}</table><div class="totals">${totalsHTML}</div></body></html>`;
    }
  };

  const handleReprintA4 = async (sale) => {
    try {
      const jsonString = sale[sale.length - 1];
      const billData = JSON.parse(jsonString);
      if (!billData || !billData.items) throw new Error("Invalid format");

      // Check memory for the Marathi setting
      let isMarathi = false;
      try {
        const savedSettings = await AsyncStorage.getItem('billingSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          isMarathi = parsed.isMarathiInvoice || false;
        }
      } catch (e) {}

      // Pass both the bill data and the language setting to the HTML generator
      const html = generateA4HTML(billData, isMarathi);
      await RNPrint.print({ html });
      
    } catch (error) {
      Alert.alert("Cannot Reprint", "This bill data is missing or from an older version.");
    }
  };

  const handleReprintThermal = async (sale) => {
    try {
      // Extract the saved JSON payload
      const jsonString = sale[sale.length - 1];
      const billData = JSON.parse(jsonString);

      if (!billData || !billData.items) throw new Error("Invalid format");

      // 1. Fetch the Marathi preference directly from memory!
      let isMarathi = false;
      try {
        const savedSettings = await AsyncStorage.getItem('billingSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          isMarathi = parsed.isMarathiInvoice || false;
        }
      } catch (e) {
        console.log("Error loading language settings", e);
      }

      // 2. THE BILINGUAL DICTIONARY
      const labels = {
        storeName: isMarathi ? "माता दी फटाका मार्ट" : "MATA DI FATAKA MART",
        address: isMarathi ? "सर्व्हे नं. १-१४, गोदरेज मेन रोड जवळ, केशवनगर, पुणे, ४११०३६" : "Survey No. 1-14, Near Godrej Main Road, Keshavnagar, Pune, 411036",
        phone: isMarathi ? "संपर्क:" : "Phone:",
        invoice: isMarathi ? "बिल क्र:" : "Invoice No:",
        date: isMarathi ? "दिनांक:" : "Date:",
        customer: isMarathi ? "ग्राहक:" : "Customer:",
        custPhone: isMarathi ? "फोन:" : "Phone:",
        itemHeader: isMarathi ? "तपशील" : "Item",
        totalHeader: isMarathi ? "एकूण" : "Total",
        discount: isMarathi ? "सवलत:" : "Discount:",
        gst: isMarathi ? "जीएसटी:" : "GST:",
        finalTotal: isMarathi ? "अंतिम रक्कम:" : "Total:",
        footer: isMarathi ? "धन्यवाद! पुन्हा भेट द्या." : "Thank You! Visit Again."
      };

      // 3. Build the Items List
      const itemsHTML = billData.items.map(item => `
        <tr>
          <td>${item.name}<br><small>${item.qty} ${item.unit} x ₹${parseFloat(item.price).toFixed(2)}</small></td>
          <td class="right">₹${(item.qty * item.price).toFixed(2)}</td>
        </tr>
      `).join('');

      // Use sale[1] for the original date, or fallback to right now
      const printDate = sale[1] ? sale[1] : new Date().toLocaleString();

      // 4. The HTML Template
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
          <p class="small">${labels.phone} 87880830 / 98220103 </p>
          <div class="line"></div>
          
          <p class="small bold">${labels.invoice} ${billData.invoiceNo || 'N/A'}</p>
          <p class="small">${labels.date} ${printDate}</p> 
          <p class="small">${labels.customer} ${billData.customerName || 'Walk-in'}</p>
          <p class="small">${labels.custPhone} ${billData.customerPhone || 'N/A'}</p>
          
          <div class="line"></div>
          <table>
            <tr><th>${labels.itemHeader}</th><th class="right">${labels.totalHeader}</th></tr>
            ${itemsHTML}
          </table>
          <div class="line"></div>
          ${billData.discount > 0 ? `<p class="small right">${labels.discount} -₹${parseFloat(billData.discount).toFixed(2)}</p>` : ''}
          ${billData.gst > 0 ? `<p class="small right">${labels.gst} +₹${parseFloat(billData.gst).toFixed(2)}</p>` : ''}
          <h3 class="right" style="margin: 5px 0;">${labels.finalTotal} ₹${parseFloat(billData.total).toFixed(2)}</h3>
          <div class="line"></div>
          <p class="small bold">${labels.footer}</p>
        </body>
        </html>
      `;

      await RNPrint.print({ html });

    } catch (error) {
      Alert.alert("Cannot Reprint", "This bill is from before the reprint feature was added, or the data is missing.");
    }
  };
  

  // --- 1. THE SMART DATE & SEARCH ENGINE ---
  const displayHistory = sales
    .slice()
    .reverse()
    .filter(sale => {
      // A. Check the Date Filters first
      if (filter !== 'All' && sale[1]) {
        const saleDate = new Date(sale[1]);
        const today = new Date();
        
        if (filter === 'Today') {
          if (saleDate.toDateString() !== today.toDateString()) return false;
        } else if (filter === 'Week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(today.getDate() - 7);
          if (saleDate < oneWeekAgo) return false;
        } else if (filter === 'Month') {
          if (saleDate.getMonth() !== today.getMonth() || saleDate.getFullYear() !== today.getFullYear()) return false;
        } else if (filter === 'Custom') {
          const start = new Date(startDate); start.setHours(0,0,0,0);
          const end = new Date(endDate); end.setHours(23,59,59,999);
          if (saleDate < start || saleDate > end) return false;
        }
      }

      // B. Check the Search Bar
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const customerName = String(sale[0] || "walk-in").toLowerCase();
        const phone = String(sale[2] || ""); 
        const amount = String(sale[12] || sale["Final Total"] || sale[6] || 0);

        if (!customerName.includes(query) && !phone.includes(query) && !amount.includes(query)) {
          return false;
        }
      }

      return true; // If it passes both filters, show it!
    });

  // --- 2. CALCULATE LIVE DASHBOARD TOTALS ---
  // This recalculates your money every time you click a filter!
  const liveRevenue = displayHistory.reduce((sum, sale) => sum + (parseFloat(sale[12] || 0)), 0);
  const liveGST = displayHistory.reduce((sum, sale) => sum + (parseFloat(sale[8] || 0)), 0); 
  const liveBillsCount = displayHistory.length;


  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sales Dashboard</Text>

      {/* FILTER ROW */}
      <View style={styles.filterRow}>
        <FilterButton title="Today" />
        <FilterButton title="Week" />
        <FilterButton title="Month" />
        <FilterButton title="All" />
      </View>

      {/* CUSTOM DATE PICKER ROW */}
      <View style={styles.customDateContainer}>
        <TouchableOpacity style={[styles.dateBtn, filter === 'Custom' && styles.filterBtnActive]} onPress={() => openPicker('start')}>
          <Text style={[styles.dateText, filter === 'Custom' && styles.filterTextActive]}>From: {startDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dateBtn, filter === 'Custom' && styles.filterBtnActive]} onPress={() => openPicker('end')}>
          <Text style={[styles.dateText, filter === 'Custom' && styles.filterTextActive]}>To: {endDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker value={pickerMode === 'start' ? startDate : endDate} mode="date" display="default" onChange={handleDateChange} />
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#d32f2f" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          {isAdmin && (
          <View style={styles.metricsContainer}>
            <View style={[styles.metricCard, { backgroundColor: '#e8f5e9', borderColor: '#4caf50' }]}>
              <Text style={styles.metricLabel}>Gross Revenue</Text>
              <Text style={[styles.metricValue, { color: '#2e7d32' }]}>₹{liveRevenue.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.metricCard, styles.halfCard, { backgroundColor: '#e3f2fd', borderColor: '#2196f3' }]}>
                <Text style={styles.metricLabel}>Total GST</Text>
                <Text style={[styles.metricValue, { color: '#1565c0', fontSize: 20 }]}>₹{liveGST.toFixed(2)}</Text>
              </View>
              <View style={[styles.metricCard, styles.halfCard, { backgroundColor: '#fff3e0', borderColor: '#ff9800' }]}>
                <Text style={styles.metricLabel}>Bills Generated</Text>
                <Text style={[styles.metricValue, { color: '#e65100', fontSize: 20 }]}>{liveBillsCount}</Text>
              </View>
            </View>
          </View>
          )}

          {/* BILL HISTORY LIST */}
          <Text style={styles.historyHeader}>Recent Bills (History)</Text>
          <TextInput
            style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', marginBottom: 15, color: '#000' }}
            placeholder="🔍 Search by Name, Phone, or Amount..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {displayHistory.slice(0, 50).map((sale, index) => {
            const customer = sale[0] || "Walk-in";
            const dateStr = sale[1] ? new Date(sale[1]).toLocaleDateString() : '';
            const total = sale[12] || sale["Final Total"] || sale[6] || 0; 
            
            return (
              <View key={index} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{customer}</Text>
                  <Text style={styles.historyDate}>{dateStr}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
  <Text style={styles.historyTotal}>₹{parseFloat(total || 0).toFixed(2)}</Text>
  
          {/* DUAL PRINT BUTTONS */}
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity 
           style={{ backgroundColor: '#e3f2fd', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 5, marginRight: 8, borderWidth: 1, borderColor: '#2196f3' }}
           onPress={() => handleReprintA4(sale)}
          >
         <Text style={{ color: '#1565c0', fontWeight: 'bold', fontSize: 12 }}>📄 A4 Bill</Text>
         </TouchableOpacity>
    
         <TouchableOpacity 
           style={{ backgroundColor: '#eeeeee', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1, borderColor: '#ccc' }}
           onPress={() => handleReprintThermal(sale)}
          >
          <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 12 }}>🖨️ Thermal</Text>
          </TouchableOpacity>
          </View>
          </View>
              </View>
            );
          })}

          <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
            <Text style={styles.refreshBtnText}>🔄 Sync Latest Data</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, backgroundColor: '#fff', padding: 5, borderRadius: 8, elevation: 2 },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 5 },
  filterBtnActive: { backgroundColor: '#d32f2f' },
  filterText: { color: '#666', fontWeight: 'bold' },
  filterTextActive: { color: '#fff' },
  
  customDateContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dateBtn: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, elevation: 2, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  dateText: { color: '#333', fontWeight: 'bold' },

  metricsContainer: { marginBottom: 20 },
  metricCard: { padding: 20, borderRadius: 10, borderWidth: 1, marginBottom: 15, elevation: 2, alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { width: '48%', padding: 15 },
  metricLabel: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5, textTransform: 'uppercase', textAlign: 'center' },
  metricValue: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  refreshBtn: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  refreshBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // NEW HISTORY STYLES
  historyHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 10 },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  historyName: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  historyDate: { fontSize: 12, color: '#888', marginTop: 3 },
  historyTotal: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' }
});