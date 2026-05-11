import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// import { supabase } from "../../../lib/supabase"; // 💡 나중에 DB 붙일 때 경로 확인!

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_important: boolean;
}

export default function NoticeListScreen({ navigation }: any) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      // 💡 나중에 supabase 연동할 때 주석 해제하세요
      /*
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("is_important", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (data) setNotices(data);
      */

      // 테스트용 가짜 데이터 (UI 확인용)
      setNotices([
        {
          id: "1",
          title: "[필독] IPASSCARE 시스템 점검 안내 (5/10 새벽 2시)",
          content: "원활한 서비스 제공을 위해 시스템 점검을 진행합니다. 점검 시간 동안은 앱 접속이 제한되니 학부모님들의 많은 양해 부탁드립니다.",
          created_at: "2026-05-02T10:00:00Z",
          is_important: true,
        },
        {
          id: "2",
          title: "신규 지점 오픈 및 이용권 혜택 안내",
          content: "시흥 배곧점이 새롭게 오픈했습니다! 오픈 기념으로 기존 회원님들께도 추가 혜택을 드립니다.",
          created_at: "2026-04-28T14:30:00Z",
          is_important: false,
        },
        {
          id: "3",
          title: "여름방학 특강 사전 예약 안내",
          content: "다가오는 여름방학을 맞이하여 집중 특강을 준비했습니다. 인기 강좌는 조기 마감될 수 있으니 서둘러 주세요.",
          created_at: "2026-04-20T09:15:00Z",
          is_important: false,
        },
      ]);
    } catch (error) {
      console.log("공지사항 로드 에러:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  const renderItem = ({ item }: { item: Notice }) => (
    <TouchableOpacity 
      style={styles.noticeCard}
      // 💡 여기서 상세 페이지로 데이터(item)를 싸들고 넘어갑니다!
      onPress={() => navigation.navigate("NoticeDetail", { notice: item })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        {item.is_important && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>중요</Text>
          </View>
        )}
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.titleText} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.previewText} numberOfLines={1}>{item.content}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 헤더 */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>공지사항</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 리스트 */}
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
            </View>
          }
        />
      )}

      {/* 💡 우측 하단 플로팅 글쓰기 버튼 (나중에 권한에 따라 숨김 처리 필요) */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate("NoticeEdit")}
        activeOpacity={0.8}
      >
        <Ionicons name="pencil" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  appBarTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  loader: { flex: 1, justifyContent: "center" },
  listContent: { padding: 20, paddingBottom: 100 }, // 버튼에 안 가려지도록 하단 여백 추가
  
  noticeCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "800",
  },
  dateText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 22,
  },
  previewText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 15, color: "#94A3B8", fontWeight: "500" },
  
  /* 💡 추가된 플로팅 버튼 스타일 */
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#111827", // 다크 네이비로 깔끔하게
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});