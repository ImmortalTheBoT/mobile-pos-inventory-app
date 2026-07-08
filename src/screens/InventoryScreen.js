import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Switch } from 'react-native';
import { fetchInventory } from '../api';

export default function InventoryScreen({ navigation }) {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // NEW: Global Pricing Toggle
  const [isWholesale, setIsWholesale] = useState(false);

  const [cart, setCart] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [unitType, setUnitType] = useState('Pack'); 

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const response = await fetchInventory();
    if (response.status === 'success') { 
      setInventory(response.data); 
      setFilteredInventory(response.data);
    }
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const response = await fetchInventory();
    if (response.status === 'success') { 
      setInventory(response.data); 
      if (searchQuery) {
        setFilteredInventory(response.data.filter(item => (item[0] || '').toLowerCase().includes(searchQuery.toLowerCase())));
      } else {
        setFilteredInventory(response.data);
      }
    }
    setIsRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      setFilteredInventory(inventory.filter(item => (item[0] || '').toLowerCase().includes(text.toLowerCase())));
    } else {
      setFilteredInventory(inventory);
    }
  };

  // DYNAMIC MATH ENGINE: Calculates final selling price (Cost + Markup)
  const getCalculatedPrice = (item, type) => {
    if (!item) return 0;
    
    // 1. Establish the Base Cost Price
    let baseCost = 0;
    if (type === 'Piece') baseCost = parseFloat(item[2] || item["Piece Price"]) || 0;
    if (type === 'Pack') baseCost = parseFloat(item[3] || item["Pack Price"]) || 0;
    if (type === 'Carton') baseCost = parseFloat(item[4] || item["Carton Price"]) || 0;
    
    // 2. Grab the Markup Percentages
    let wholesaleMarkup = parseFloat(item[7] || item["Wholesale %"]) || 0;
    let retailMarkup = parseFloat(item[8] || item["Retail %"]) || 0;
    
    // 3. Add the correct markup to the Base Cost
    if (isWholesale) {
      return baseCost + (baseCost * (wholesaleMarkup / 100)); // ADDING Wholesale Markup
    } else {
      return baseCost + (baseCost * (retailMarkup / 100));    // ADDING Retail Markup
    }
  };

  const openBillingModal = (item) => {
    setSelectedItem(item);
    setQuantity('1');
    setUnitType('Pack');
    setModalVisible(true);
  };

  const addToCart = () => {
    if (!selectedItem || quantity <= 0) return;
    const newItem = { ...selectedItem, sellQuantity: parseInt(quantity), sellUnit: unitType };
    setCart([...cart, newItem]);
    setModalVisible(false);
  };

  const renderItem = ({ item }) => {
    const name = item[0] || item["Item Name"] || 'Unknown Item';
    const brand = item[1] || item["Brand"] || '';
    const stock = item[5] || item["Stock Quantity"] || '0';
    
    if (name === 'Item Name') return null; 

    // Get the dynamic Pack Price for the list view
    const displayPackPrice = getCalculatedPrice(item, 'Pack').toFixed(2);

    return (
      <View style={styles.card}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{name}</Text>
          <Text style={styles.itemBrand}>{brand}</Text>
          <Text style={styles.itemStock}>Stock: {stock}</Text>
        </View>
        
        {/* NEW: Display Pack Price Directly on Card */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Pack Price</Text>
          <Text style={styles.priceValue}>₹{displayPackPrice}</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => openBillingModal(item)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Calculate live total for the Modal
  const modalUnitPrice = getCalculatedPrice(selectedItem, unitType);
  const modalTotalPrice = (modalUnitPrice * Math.max(1, parseInt(quantity || 0))).toFixed(2);

  return (
    <View style={styles.container}>
      
      {/* HEADER: Search & Global Pricing Toggle */}
      <View style={styles.headerContainer}>
        <TextInput style={styles.searchInput} placeholder="Search for items..." placeholderTextColor="#999" value={searchQuery} onChangeText={handleSearch} color="#000" />
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>{isWholesale ? "Pricing: WHOLESALE" : "Pricing: RETAIL"}</Text>
          <Switch value={isWholesale} onValueChange={setIsWholesale} trackColor={{ false: "#767577", true: "#ffeb3b" }} thumbColor={isWholesale ? "#fff" : "#f4f3f4"} />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#d32f2f" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={filteredInventory} 
          keyExtractor={(item, index) => index.toString()} 
          renderItem={renderItem} 
          contentContainerStyle={{ paddingBottom: 80 }} 
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      {cart.length > 0 && (
        <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart', { cartItems: cart })}>
          <Text style={styles.cartButtonText}>Proceed to Checkout ({cart.length})</Text>
        </TouchableOpacity>
      )}

      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add {selectedItem ? selectedItem[0] : ''}</Text>

            <View style={styles.unitSelector}>
              {['Piece', 'Pack', 'Carton'].map((unit) => (
                <TouchableOpacity key={unit} style={[styles.unitBtn, unitType === unit && styles.unitBtnActive]} onPress={() => setUnitType(unit)}>
                  <Text style={[styles.unitText, unitType === unit && styles.unitTextActive]}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* HIGH VISIBILITY +/- ROW */}
            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(String(Math.max(1, parseInt(quantity || 0) - 1)))}>
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <TextInput style={styles.qtyInput} keyboardType="numeric" value={quantity} onChangeText={setQuantity} color="#000" />
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(String(parseInt(quantity || 0) + 1))}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* NEW: LIVE PRICE DISPLAY */}
            <View style={styles.livePriceBox}>
              <Text style={styles.livePriceLabel}>Calculated Total:</Text>
              <Text style={styles.livePriceValue}>₹{modalTotalPrice}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addToCart}><Text style={styles.addBtnText}>Add to Cart</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerContainer: { padding: 10, backgroundColor: '#d32f2f' },
  searchInput: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, fontSize: 16, marginBottom: 10 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5 },
  toggleText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginHorizontal: 10, marginTop: 10, borderRadius: 8, elevation: 2, alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  itemBrand: { color: '#666', fontSize: 12, marginTop: 2 },
  itemStock: { color: '#2e7d32', marginTop: 5, fontWeight: 'bold' },
  
  priceContainer: { marginRight: 15, alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase' },
  priceValue: { fontSize: 18, fontWeight: 'bold', color: '#d32f2f' },
  
  addButton: { backgroundColor: '#d32f2f', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 26 },
  
  cartButton: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, alignItems: 'center', elevation: 5 },
  cartButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  
  unitSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  unitBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginHorizontal: 2, alignItems: 'center' },
  unitBtnActive: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  unitText: { color: '#333' },
  unitTextActive: { color: '#fff', fontWeight: 'bold' },
  
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  qtyBtn: { backgroundColor: '#d32f2f', width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 25, elevation: 3 },
  qtyBtnText: { fontSize: 30, fontWeight: 'bold', color: '#fff', lineHeight: 32 },
  qtyInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, width: 80, height: 50, textAlign: 'center', fontSize: 20, marginHorizontal: 15, backgroundColor: '#fafafa', fontWeight: 'bold' },
  
  livePriceBox: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  livePriceLabel: { fontSize: 16, color: '#666', fontWeight: '500' },
  livePriceValue: { fontSize: 24, color: '#2e7d32', fontWeight: 'bold' },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { padding: 10, marginRight: 10 },
  cancelBtnText: { color: '#666', fontSize: 16 },
  addBtn: { backgroundColor: '#2e7d32', padding: 10, paddingHorizontal: 20, borderRadius: 5 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});