import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");

export default function AdminWithdrawalScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchWithdrawalRequests();
  }, [activeTab, selectedDate]);

  const fetchWithdrawalRequests = async () => {
    setLoading(true);
    let query = supabase.from("withdrawal_requests").select("*, users(username, name)");

    if (activeTab === 'pending') {
      query = query.eq("status", "pending");
    } else {
      const start = selectedDate.startOf('day').toISOString();
      const end = selectedDate.endOf('day').toISOString();
      query = query.eq("status", "completed").gte("processed_at", start).lte("processed_at", end);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) console.error(error);
    else setRequests(data || []);
    setLoading(false);
  };

  const filteredData = requests.filter(item => 
    item.users?.name?.toLowerCase().includes(searchText.toLowerCase()) || 
    item.users?.username?.toLowerCase().includes(searchText.toLowerCase()) || 
    item.account_holder?.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const handleComplete = async (request: any) => {
    Alert.alert("송금 완료", "입금을 완료하셨나요?", [
      { text: "취소" },
      {
        text: "확인",
        onPress: async () => {
          const { error } = await supabase
            .from("withdrawal_requests")
            .update({ status: "completed", processed_at: new Date().toISOString() })
            .eq("id", request.id);
          if (error) Alert.alert("오류", "처리 실패");
          else {
            Alert.alert("완료", "송금 처리가 완료되었습니다.");
            fetchWithdrawalRequests();
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.title}>인출 요청 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}><Text style={activeTab === 'pending' ? styles.activeTabText : styles.tabText}>대기 중</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'completed' && styles.activeTab]} onPress={() => setActiveTab('completed')}><Text style={activeTab === 'completed' ? styles.activeTabText : styles.tabText}>완료 내역</Text></TouchableOpacity>
      </View>

      {activeTab === 'completed' && (
        <View style={styles.filterContainer}>
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={() => setSelectedDate(selectedDate.subtract(1, 'day'))}><Ionicons name="chevron-back" size={20}/></TouchableOpacity>
            <Text style={styles.dateText}>{selectedDate.format("YYYY.MM.DD")}</Text>
            <TouchableOpacity onPress={() => setSelectedDate(selectedDate.add(1, 'day'))}><Ionicons name="chevron-forward" size={20}/></TouchableOpacity>
          </View>
          <TextInput 
            style={styles.searchInput} 
            placeholder="이름, ID, 예금주로 검색" 
            value={searchText} 
            onChangeText={setSearchText} 
            autoCapitalize="none"
          />
          <Text style={styles.totalText}>일일 총액: {totalAmount.toLocaleString()} P</Text>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" style={{ marginTop: 50 }} /> : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.userName} numberOfLines={1}>{item.users?.name || "알수없음"}</Text>
                <Text style={styles.amount}>{item.amount.toLocaleString()} P</Text>
              </View>
              <Text style={styles.userAccount}>ID: {item.users?.username}</Text>
              
              <View style={styles.divider} />
              
              {/* 🚀 항목별로 깔끔하게 라벨링된 정보 영역 */}
              <View style={styles.infoBlock}>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>은행</Text><Text style={styles.infoValue}>{item.bank_name}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>계좌</Text><Text style={styles.infoValue}>{item.account_number}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>예금주</Text><Text style={styles.infoValue}>{item.account_holder}</Text></View>
                {activeTab === 'pending' && (
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>신청일시</Text><Text style={styles.infoValue}>{dayjs(item.created_at).format("YYYY.MM.DD HH:mm")}</Text></View>
                )}
              </View>
              
              {activeTab === 'pending' ? (
                <TouchableOpacity style={styles.btn} onPress={() => handleComplete(item)}><Text style={styles.btnText}>송금 완료 처리</Text></TouchableOpacity>
              ) : (
                <Text style={styles.date}>처리완료시간: {dayjs(item.processed_at).format("HH:mm")}</Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", padding: 20, backgroundColor: "#FFF", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "bold" },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#4D96FF' },
  tabText: { color: '#94A3B8', fontWeight: 'bold' },
  activeTabText: { color: '#4D96FF', fontWeight: 'bold' },
  filterContainer: { padding: 15, backgroundColor: '#FFF' },
  dateNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  dateText: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 20 },
  searchInput: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, marginBottom: 10 },
  totalText: { fontSize: 14, fontWeight: 'bold', color: '#2563EB', textAlign: 'right' },
  list: { padding: 20 },
  card: { backgroundColor: "#FFF", padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: "#E2E8F0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  userName: { fontSize: 17, fontWeight: "800", flex: 1 },
  amount: { fontSize: 17, fontWeight: "900", color: "#2563EB", marginLeft: 10 },
  userAccount: { fontSize: 13, color: "#64748B", marginBottom: 10 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 10 },
  infoBlock: { marginTop: 4 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { fontSize: 13, color: "#64748B", fontWeight: '700', width: 60 },
  infoValue: { fontSize: 14, color: "#1E293B", fontWeight: "600", flex: 1 },
  btn: { backgroundColor: "#10B981", padding: 14, borderRadius: 10, marginTop: 15, alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
  date: { fontSize: 12, color: "#10B981", marginTop: 10, fontWeight: "700" },
});