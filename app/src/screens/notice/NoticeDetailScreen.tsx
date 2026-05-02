import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function NoticeDetailScreen({ route, navigation }: any) {
  // 이전 화면(NoticeListScreen)에서 넘겨준 공지사항 데이터를 받습니다.
  const { notice } = route.params; 

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. 상단 앱바 */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        
        <Text style={styles.appBarTitle}>공지사항</Text>
        
        {/* 💡 기존의 빈 View를 지우고, [수정] 버튼으로 교체했습니다! */}
        <TouchableOpacity onPress={() => navigation.navigate("NoticeEdit", { notice })}>
          <Ionicons name="create-outline" size={26} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 2. 공지사항 헤더 (제목 및 날짜) */}
        <View style={styles.headerSection}>
          {notice.is_important && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>중요</Text>
            </View>
          )}
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.date}>{formatDate(notice.created_at)}</Text>
        </View>

        <View style={styles.divider} />

        {/* 3. 공지사항 본문 내용 */}
        <View style={styles.contentSection}>
          <Text style={styles.content}>{notice.content}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  appBarTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  container: { flex: 1 },
  headerSection: { padding: 24 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: { color: "#EF4444", fontSize: 12, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "700", color: "#1E293B", lineHeight: 32, marginBottom: 12 },
  date: { fontSize: 13, color: "#94A3B8" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 24 },
  contentSection: { padding: 24, paddingBottom: 60 },
  content: { fontSize: 16, color: "#475569", lineHeight: 26 },
});