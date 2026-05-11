import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MyPackageScreen({ navigation }: any) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0); // 인덱스(0,1,2)로 관리
  
  const flatListRef = useRef<FlatList>(null);
  const TABS = ["AVAILABLE", "USED", "EXPIRED"] as const;

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_packages")
          .select(`*, children (child_name)`)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setPackages(data || []);
      }
    } catch (error) {
      console.log("이용권 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 탭 클릭 시 해당 페이지로 스크롤
  const handleTabPress = (index: number) => {
    setActiveTab(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  // 스크롤이 멈췄을 때 현재 페이지 계산하여 탭 상태 업데이트
  const onMomentumScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveTab(index);
  };

  // 개별 이용권 카드 렌더링 (중복 방지용 함수)
  const renderPackageItem = (pkg: any) => (
    <View key={pkg.id} style={styles.packageCard}>
      <View style={styles.cardTop}>
        <View style={styles.childTag}>
          <Text style={styles.childTagText}>{pkg.children?.child_name || "자녀 미지정"}</Text>
        </View>
        <Text style={styles.sessionInfo}>{pkg.remaining_count} / {pkg.total_count}회</Text>
      </View>
      <Text style={styles.packageName}>{pkg.package_name}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.expiryText}>유효기간: {new Date(pkg.expiry_date).toLocaleDateString()}</Text>
        {TABS[activeTab] === "AVAILABLE" && (
          <TouchableOpacity 
            style={styles.reserveBtn}
            onPress={() => navigation.navigate("Reservation", { packageId: pkg.id })}
          >
            <Text style={styles.reserveBtnText}>예약하기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // 각 탭별 컨텐츠 리스트 (가로로 배열될 요소)
  const renderTabPage = ({ item: tabType }: { item: string }) => {
    const filtered = packages.filter((pkg) => {
      if (tabType === "AVAILABLE") return pkg.status === "active" || pkg.status === "pending";
      if (tabType === "USED") return pkg.status === "exhausted";
      if (tabType === "EXPIRED") return pkg.status === "expired";
      return false;
    });

    return (
      <View style={{ width: SCREEN_WIDTH }}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>해당하는 이용권이 없습니다.</Text>
            </View>
          }
          renderItem={({ item }) => renderPackageItem(item)}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 이용권 확인</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Pass")}>
          <Text style={styles.headerRightText}>이용권 구매</Text>
        </TouchableOpacity>
      </View>

      {/* 상단 탭 버튼 */}
      <View style={styles.tabContainer}>
        {TABS.map((tab, index) => (
          <TouchableOpacity 
            key={tab}
            style={[styles.tabButton, activeTab === index && styles.activeTabButton]}
            onPress={() => handleTabPress(index)}
          >
            <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
              {tab === "AVAILABLE" ? "사용가능" : tab === "USED" ? "사용완료" : "기한만료"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 가로 스와이프 가능한 컨텐츠 영역 */}
      <FlatList
        ref={flatListRef}
        data={TABS}
        renderItem={renderTabPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        keyExtractor={(item) => item}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#FFF" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerRightText: { fontSize: 16, color: "#4F46E5", fontWeight: "700" },
  
  tabContainer: { flexDirection: "row", backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: "center" },
  activeTabButton: { borderBottomWidth: 3, borderBottomColor: "#4F46E5" },
  tabText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  activeTabText: { color: "#4F46E5", fontWeight: "800" },
  
  scrollContent: { padding: 20 },
  packageCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  childTag: { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  childTagText: { color: "#4F46E5", fontSize: 12, fontWeight: "700" },
  sessionInfo: { fontSize: 16, fontWeight: "800", color: "#111827" },
  packageName: { fontSize: 17, fontWeight: "700", color: "#334155", marginBottom: 15 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  expiryText: { fontSize: 12, color: "#94A3B8" },
  reserveBtn: { backgroundColor: "#111827", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  reserveBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 10, color: "#94A3B8", fontSize: 15 }
});