import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { addItemToSheet, deleteItemFromSheet, logWastageToSheet } from '../api';

export default function AdminScreen() {
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [stock, setStock] = useState('');
  const [packCost, setPackCost] = useState('');
  const [piecesPerPack, setPiecesPerPack] = useState('');
  const [packsPerCarton, setPacksPerCarton] = useState('');
  const [wholesaleMarkup, setWholesaleMarkup] = useState('');
  const [retailMarkup, setRetailMarkup] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [wasteName, setWasteName] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('');
  const [isWasting, setIsWasting] = useState(false);

  const [deleteName, setDeleteName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const calcPieceCost = (packCost && piecesPerPack && parseInt(piecesPerPack) > 0) ? (parseFloat(packCost) / parseInt(piecesPerPack)).toFixed(2) : '0.00';
  const calcCartonCost = (packCost && packsPerCarton && parseInt(packsPerCarton) > 0) ? (parseFloat(packCost) * parseInt(packsPerCarton)).toFixed(2) : '0.00';

  const handleAddItem = async () => {
    if (!itemName || !packCost) {
      Alert.alert("Missing Fields", "Item Name and Pack Cost are required."); return;
    }
    setIsAdding(true);
    const itemData = {
      itemName, brand, piecePrice: parseFloat(calcPieceCost), packPrice: parseFloat(packCost), 
      cartonPrice: parseFloat(calcCartonCost), stock: parseInt(stock) || 0, 
      wholesalePercent: parseFloat(wholesaleMarkup) || 0, retailPercent: parseFloat(retailMarkup) || 0,
      costPrice: parseFloat(packCost)
    };
    
    const response = await addItemToSheet(itemData);
    setIsAdding(false);
    
    if (response.status === 'success') {
      Alert.alert("Added!", `${itemName} created.`);
      setItemName(''); setBrand(''); setPackCost(''); setPiecesPerPack(''); setPacksPerCarton(''); 
      setStock(''); setWholesaleMarkup(''); setRetailMarkup('');
    } else { Alert.alert("Error", "Failed to connect to database."); }
  };

  const handleLogWastage = async () => {
    if (!wasteName || !wasteQty) { Alert.alert("Error", "Name and Quantity required."); return; }
    setIsWasting(true);
    const response = await logWastageToSheet({ itemName: wasteName, qty: wasteQty, reason: wasteReason || "Not specified" });
    setIsWasting(false);
    if (response.status === 'success') {
      Alert.alert("Logged", `Subtracted ${wasteQty} from ${wasteName}.`);
      setWasteName(''); setWasteQty(''); setWasteReason('');
    }
  };

  const handleDeleteItem = () => {
    if (!deleteName) return;
    Alert.alert("WARNING", `Delete ${deleteName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setIsDeleting(true);
          const response = await deleteItemFromSheet(deleteName);
          setIsDeleting(false);
          if (response.status === 'success') { Alert.alert("Deleted", "Item removed."); setDeleteName(''); } 
          else { Alert.alert("Not Found", "Item not in database."); }
        } 
      }
    ]);
  };

  // Helper to ensure text inputs always look correct
  const inputProps = { placeholderTextColor: "#555", color: "#000", style: styles.input };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Create New Product</Text>
        <TextInput {...inputProps} placeholder="Item Name *" value={itemName} onChangeText={setItemName} />
        <View style={styles.row}>
          <TextInput {...inputProps} style={[styles.input, styles.halfInput]} placeholder="Brand" value={brand} onChangeText={setBrand} />
          <TextInput {...inputProps} style={[styles.input, styles.halfInput]} placeholder="Initial Stock" keyboardType="numeric" value={stock} onChangeText={setStock} />
        </View>
        
        <Text style={styles.label}>Base Costs (Your Purchase Price)</Text>
        <TextInput {...inputProps} style={[styles.input, {borderColor: '#d32f2f'}]} placeholder="Pack Cost (₹) *" keyboardType="numeric" value={packCost} onChangeText={setPackCost} />
        <View style={styles.row}>
          <TextInput {...inputProps} style={[styles.input, styles.halfInput]} placeholder="Pieces per Pack" keyboardType="numeric" value={piecesPerPack} onChangeText={setPiecesPerPack} />
          <TextInput {...inputProps} style={[styles.input, styles.halfInput]} placeholder="Packs per Carton" keyboardType="numeric" value={packsPerCarton} onChangeText={setPacksPerCarton} />
        </View>

        <Text style={styles.label}>Customer Markups</Text>
        <View style={styles.row}>
          <TextInput {...inputProps} style={[styles.input, styles.halfInput]} placeholder="Wholesale Markup (%)" keyboardType="numeric" value={wholesaleMarkup} onChangeText={setWholesaleMarkup} />
          <TextInput {...inputProps} style={[styles.input, styles.halfInput]} placeholder="Retail Markup (%)" keyboardType="numeric" value={retailMarkup} onChangeText={setRetailMarkup} />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem} disabled={isAdding}>
          {isAdding ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Push to Database</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, {borderColor: '#ff9800', borderWidth: 1}]}>
        <Text style={[styles.cardTitle, {color: '#ff9800'}]}>⚠️ Log Damaged Stock</Text>
        <TextInput {...inputProps} placeholder="Exact Item Name" value={wasteName} onChangeText={setWasteName} />
        <View style={styles.row}>
          <TextInput {...inputProps} style={[styles.input, styles.halfInput]} placeholder="Qty Damaged" keyboardType="numeric" value={wasteQty} onChangeText={setWasteQty} />
          <TextInput {...inputProps} style={[styles.input, styles.halfInput]} placeholder="Reason (Wet, Torn)" value={wasteReason} onChangeText={setWasteReason} />
        </View>
        <TouchableOpacity style={[styles.addBtn, {backgroundColor: '#ff9800'}]} onPress={handleLogWastage} disabled={isWasting}>
          {isWasting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Deduct from Stock</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, {borderColor: '#d32f2f', borderWidth: 1}]}>
        <Text style={styles.cardTitle}>🗑️ Delete Product</Text>
        <TextInput {...inputProps} placeholder="Exact Item Name to Delete" value={deleteName} onChangeText={setDeleteName} />
        <TouchableOpacity style={[styles.addBtn, {backgroundColor: '#d32f2f'}]} onPress={handleDeleteItem} disabled={isDeleting}>
          {isDeleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Permanently Delete</Text>}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 3, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  label: { fontSize: 14, color: '#444', marginBottom: 5, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 15, backgroundColor: '#fff', fontSize: 16, fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  addBtn: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});