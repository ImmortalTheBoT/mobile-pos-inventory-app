import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FAQScreen({ navigation }) {

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userData');
              await AsyncStorage.removeItem('userId');
              // Ensure 'Login' matches the exact route name in your App.tsx / Navigation!
              navigation.replace('Login'); 
            } catch (error) {
              console.log("Error logging out", error);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <Text style={styles.title}>Help & FAQs</Text>

      {/* NEW: THERMAL PRINTING */}
      <View style={styles.card}>
        <Text style={styles.question}>Q: How do I print a Thermal Receipt? (थर्मल पावती कशी प्रिंट करावी?)</Text>
        <Text style={styles.answer}>1. Download the 'RawBT' app from the Google Play Store.{"\n"}2. Pair your Bluetooth printer to your phone.{"\n"}3. In the app, go to Analytics, search for the bill, and tap '🖨️ Thermal'. Select 'RawBT' to print.</Text>
        <Text style={styles.answerMarathi}>१. प्ले स्टोअरवरून 'RawBT' ॲप डाउनलोड करा.{"\n"}२. फोनच्या ब्लूटूथला प्रिंटर कनेक्ट करा.{"\n"}३. Analytics मध्ये जाऊन बिल शोधा आणि '🖨️ Thermal' दाबा.</Text>
      </View>

      {/* NEW: BILL SEARCH */}
      <View style={styles.card}>
        <Text style={styles.question}>Q: How to search or reprint old bills? (जुनी बिले कशी शोधावीत?)</Text>
        <Text style={styles.answer}>Use the Analytics tab. Type the customer's Name, Phone Number, or Bill Amount in the Search Bar to instantly find their history.</Text>
        <Text style={styles.answerMarathi}>Analytics टॅब वापरा. सर्च बारमध्ये ग्राहकाचे नाव, फोन नंबर किंवा बिलाची रक्कम टाकून बिल लगेच शोधा.</Text>
      </View>

      {/* NEW: ADMIN DASHBOARD */}
      <View style={styles.card}>
        <Text style={styles.question}>Q: Why can't I see Gross Revenue? (मला एकूण विक्री आणि टॅक्स का दिसत नाही?)</Text>
        <Text style={styles.answer}>For security, financial numbers are hidden. Only the 'Admin' account can see the Total Revenue and GST. Staff can only see the Bill History.</Text>
        <Text style={styles.answerMarathi}>सुरक्षेसाठी, आर्थिक माहिती फक्त 'Admin' ला दिसते. स्टाफ फक्त बिले पाहू आणि प्रिंट करू शकतो.</Text>
      </View>

      {/* EXISTING: WHOLESALE */}
      <View style={styles.card}>
        <Text style={styles.question}>Q: How does the Wholesale Toggle work? (होलसेल बटण काय करते?)</Text>
        <Text style={styles.answer}>The toggle automatically switches pricing from Retail Markups to Wholesale Markups based on the percentages you set in the Management tab.</Text>
        <Text style={styles.answerMarathi}>हे बटण दाबल्यास, सर्व वस्तूंचे दर 'रिटेल' मधून थेट 'होलसेल' दरांमध्ये बदलतात.</Text>
      </View>

      {/* EXISTING: INVENTORY */}
      <View style={styles.card}>
        <Text style={styles.question}>Q: How do I update inventory manually? (इन्वेंटरी कशी अपडेट करावी?)</Text>
        <Text style={styles.answer}>Use the 'Management' tab. Enter the exact Item Name and subtract the stock. All manual updates directly edit the Google Sheet and save in 'Stock_History'.</Text>
        <Text style={styles.answerMarathi}>'Management' टॅब वापरा. मालाचे नाव टाका आणि स्टॉक कमी करा. सर्व बदल Google Sheet मध्ये सेव्ह होतात.</Text>
      </View>

      {/* EXISTING: LIMITATIONS */}
      <View style={styles.card}>
        <Text style={styles.question}>⚠️ Limitations (मर्यादा)</Text>
        <Text style={styles.answer}>1. You must have an active internet connection to finalize a bill.{"\n"}2. WhatsApp sending requires the official WhatsApp app to be installed on the device.</Text>
        <Text style={styles.answerMarathi}>१. बिल बनवण्यासाठी इंटरनेट कनेक्शन असणे आवश्यक आहे.{"\n"}२. ग्राहकाला पावती पाठवण्यासाठी फोनमध्ये WhatsApp असणे गरजेचे आहे.</Text>
      </View>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 Log Out (बाहेर पडा)</Text>
      </TouchableOpacity>
      
      <Text style={styles.footerText}>App Version 1.0.0</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#d32f2f', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, elevation: 2, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#d32f2f' },
  question: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  answer: { fontSize: 14, color: '#555', marginBottom: 8, lineHeight: 20 },
  answerMarathi: { fontSize: 14, color: '#1565c0', lineHeight: 20 },
  logoutBtn: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 10 },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerText: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 5 }
});