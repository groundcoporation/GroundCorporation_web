import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import dayjs from "dayjs";

type FilterType = "ALL" | "EARN" | "USE" | "WITHDRAW";

export default function PointHistoryScreen({ navigation }: any) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    if (user) {
      fetchPointLogs();
    }
  }, [user]);

  const fetchPointLogs = async () => {
    setLoading(true);
    try {
      // 🚀 DB에서 가져올 때부터 최신순 정렬
      const { data, error } = await supabase
        .from("point_logs")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("포인트 내역 로드 에러:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 [핵심] 텍스트가 아닌 DB의 'type' 컬럼(earn, use, withdraw)으로 필터링
  const filteredLogs = logs.filter((log) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "EARN") return log.type === "earn";
    if (activeFilter === "USE") return log.type === "use";
    if (activeFilter === "WITHDRAW") return log.type === "withdraw";
    return true;
  });

  const renderLogItem = ({ item }: { item: any }) => {
    // type이 earn이면 양수(파란색), 아니면 음수(빨간색)
    const isEarn = item.type === "earn";
    
    return (
      <View style={styles.logItem}>
        <View style={styles.logLeft}>
          <Text style={styles.logReason}>{item.reason}</Text>
          <Text style={styles.logDate}>
            {dayjs(item.created_at).format("YYYY.MM.DD HH:mm")}
          </Text>
        </View>
        <View style={styles.logRight}>
          <Text style={[styles.logAmount, isEarn ? styles.amountEarn : styles.amountUse]}>
            {isEarn ? "+" : ""}{item.amount.toLocaleString()} P
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포인트 내역</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 필터 탭 4개 렌더링 */}
      <View style={styles.filterContainer}>
        {(["ALL", "EARN", "USE", "WITHDRAW"] as FilterType[]).map((type) => {
          const labels = { ALL: "전체", EARN: "적립", USE: "사용", WITHDRAW: "인출" };
          const isActive = activeFilter === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.filterTab, isActive && styles.activeFilterTab]}
              onPress={() => setActiveFilter(type)}
            >
              <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                {labels[type]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 내역 리스트 */}
      {loading ? (
        <ActivityIndicator size="large" color="#4D96FF" style={{ marginTop: 50 }} />
      ) : filteredLogs.length > 0 ? (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>포인트 내역이 없습니다.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  activeFilterTab: {
    backgroundColor: "#4D96FF",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  activeFilterText: {
    color: "#FFF",
  },
  
  listContent: { padding: 20 },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  logLeft: { flex: 1, paddingRight: 10 },
  logReason: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  logDate: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  logRight: { alignItems: "flex-end" },
  logAmount: { fontSize: 16, fontWeight: "800" },
  amountEarn: { color: "#3B82F6" }, 
  amountUse: { color: "#EF4444" },  
  
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -50,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "600",
  },
});