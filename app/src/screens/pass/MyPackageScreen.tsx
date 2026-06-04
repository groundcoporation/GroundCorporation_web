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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MyPackageScreen({ navigation }: any) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0); // 인덱스(0,1,2)로 관리
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList>(null);
  const TABS = ["AVAILABLE", "USED", "EXPIRED"] as const;

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_packages")
          .select(`*, children (child_name)`)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (data) {
          const today = dayjs().startOf("day");
          
          // 1. 만료 처리 대상 (active/pending 인데 날짜 지난 것)
          const toExpire = data.filter(
            (pkg) =>
              (pkg.status?.toLowerCase() === "active" || pkg.status?.toLowerCase() === "pending") &&
              dayjs(pkg.expiry_date).startOf("day").isBefore(today)
          );

          // 2. 사용 완료 처리 대상 (active 인데 횟수 0인 것)
          const toExhaust = data.filter(
            (pkg) =>
              pkg.status?.toLowerCase() === "active" && pkg.remaining_count <= 0
          );

          if (toExpire.length > 0) {
            await supabase
              .from("user_packages")
              .update({ status: "expired" })
              .in("id", toExpire.map(p => p.id));
          }

          if (toExhaust.length > 0) {
            await supabase
              .from("user_packages")
              .update({ status: "exhausted" })
              .in("id", toExhaust.map(p => p.id));
          }

          // 로컬 상태 업데이트
          const updatedData = data.map((pkg) => {
            if (toExpire.find((p) => p.id === pkg.id)) return { ...pkg, status: "expired" };
            if (toExhaust.find((p) => p.id === pkg.id)) return { ...pkg, status: "exhausted" };
            return pkg;
          });
          setPackages(updatedData);
        }
      }
    } catch (error) {
      console.log("이용권 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 만료 여부 확인 함수
  const isExpired = (pkg: any) => {
    if (pkg.status?.toLowerCase() === "expired") return true;
    const today = dayjs().startOf("day");
    const expiryDate = dayjs(pkg.expiry_date).startOf("day");
    return expiryDate.isBefore(today);
  };

  // 사용 완료 여부 확인 함수
  const isExhausted = (pkg: any) => {
    return pkg.status?.toLowerCase() === "exhausted" || pkg.remaining_count <= 0;
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

  // 개별 이용권 카드 렌더링
  const renderPackageItem = (pkg: any) => {
    const expired = isExpired(pkg);
    const exhausted = isExhausted(pkg);
    const inactive = expired || exhausted;
    const isShuttle = pkg.is_shuttle || false;

    // 남은 일수 계산 (셔틀용)
    const remainingDays = dayjs(pkg.expiry_date).diff(dayjs().startOf("day"), "day");
    const dDayLabel = remainingDays < 0 ? "만료" : `${remainingDays}일 남음`;

    return (
      <View
        key={pkg.id}
        style={[styles.packageCard, inactive && styles.inactiveCard]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.childTag, inactive && styles.inactiveChildTag]}>
            <Text
              style={[
                styles.childTagText,
                inactive && styles.inactiveChildTagText,
              ]}
            >
              {pkg.children?.child_name || "자녀 미지정"}
            </Text>
          </View>
          <Text style={[styles.sessionInfo, inactive && styles.inactiveText]}>
            {isShuttle ? dDayLabel : `${pkg.remaining_count} / ${pkg.total_count}회`}
          </Text>
        </View>
        <Text style={[styles.packageName, inactive && styles.inactiveText]}>
          {pkg.package_name} {isShuttle && "(셔틀)"}
        </Text>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.expiryText}>
              유효기간: {new Date(pkg.expiry_date).toLocaleDateString()}
            </Text>
            {expired && <Text style={styles.expiredLabel}>만료됨</Text>}
            {exhausted && !expired && !isShuttle && <Text style={styles.usedLabel}>사용완료</Text>}
          </View>
          {!inactive && !isShuttle && TABS[activeTab] === "AVAILABLE" && (
            <TouchableOpacity
              style={styles.reserveBtn}
              onPress={() =>
                navigation.navigate("Reservation", { packageId: pkg.id })
              }
            >
              <Text style={styles.reserveBtnText}>예약하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // 각 탭별 컨텐츠 리스트 (가로로 배열될 요소)
  const renderTabPage = ({ item: tabType }: { item: string }) => {
    const filtered = packages.filter((pkg) => {
      const status = pkg.status?.toLowerCase();
      const expired = isExpired(pkg);
      const exhausted = isExhausted(pkg);

      if (tabType === "AVAILABLE")
        return (status === "active" || status === "pending") && !expired && !exhausted;
      if (tabType === "USED") return exhausted && !expired;
      if (tabType === "EXPIRED") return expired;
      return false;
    });

    return (
      <View style={{ width: SCREEN_WIDTH }}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
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
            style={[
              styles.tabButton,
              activeTab === index && styles.activeTabButton,
            ]}
            onPress={() => handleTabPress(index)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === index && styles.activeTabText,
              ]}
            >
              {tab === "AVAILABLE"
                ? "사용가능"
                : tab === "USED"
                  ? "사용완료"
                  : "기한만료"}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerRightText: { fontSize: 16, color: "#4F46E5", fontWeight: "700" },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabButton: { flex: 1, paddingVertical: 15, alignItems: "center" },
  activeTabButton: { borderBottomWidth: 3, borderBottomColor: "#4F46E5" },
  tabText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  activeTabText: { color: "#4F46E5", fontWeight: "800" },

  scrollContent: { padding: 20 },
  packageCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  // 👇 비활성화(만료/사용완료) 카드 스타일 (배경을 흐리게 변경)
  inactiveCard: {
    backgroundColor: "#F1F5F9",
    elevation: 0,
    shadowOpacity: 0,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  childTag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  // 👇 비활성화된 자녀 태그 스타일
  inactiveChildTag: {
    backgroundColor: "#E2E8F0",
  },
  childTagText: { color: "#4F46E5", fontSize: 12, fontWeight: "700" },
  // 👇 비활성화된 자녀 태그 텍스트 스타일
  inactiveChildTagText: {
    color: "#94A3B8",
  },
  sessionInfo: { fontSize: 16, fontWeight: "800", color: "#111827" },
  packageName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 15,
  },
  // 👇 비활성화된 텍스트 공통 스타일 (글자색 회색으로)
  inactiveText: {
    color: "#94A3B8",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expiryText: { fontSize: 12, color: "#94A3B8" },
  // 👇 만료됨 레이블 텍스트 스타일
  expiredLabel: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "700",
    marginTop: 2,
  },
  // 👇 사용완료 레이블 텍스트 스타일
  usedLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    marginTop: 2,
  },
  reserveBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reserveBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 10, color: "#94A3B8", fontSize: 15 },
});
