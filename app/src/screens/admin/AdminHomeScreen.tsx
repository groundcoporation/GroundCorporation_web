import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // 🚀 경로 확인 필수
import dayjs from "dayjs";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 60) / 2;

export default function AdminHomeScreen({ navigation }: any) {
  // 🚀 통합 요약 상태 관리
  const [summary, setSummary] = useState({
    todayConsult: 0,
    monthConsult: 0,
    todayRes: 0,
    monthRes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 🚀 dayjs를 사용하여 현재 한국 시간 기준으로 날짜 문자열 생성
      const todayStart = dayjs().tz().startOf("day").format(); // 오늘 자정 (KST)
      const monthStart = dayjs().tz().startOf("month").format(); // 이번 달 1일 자정 (KST)

      // 1. 신규 상담 카운트 (오늘 / 이번 달)
      const { count: tConsult } = await supabase
        .from("consultation_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING")
        .gte("created_at", todayStart);

      const { count: mConsult } = await supabase
        .from("consultation_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart);

      // 2. 예약 인원 카운트 (오늘 / 이번 달)
      const { count: tRes } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("class_date", dayjs().tz().format("YYYY-MM-DD")); // 오늘 날짜 (YYYY-MM-DD)

      const { count: mRes } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .gte(
          "class_date",
          dayjs().tz().startOf("month").format("YYYY-MM-DD"), // 이번 달 1일 (YYYY-MM-DD)
        );

      setSummary({
        todayConsult: tConsult || 0,
        monthConsult: mConsult || 0,
        todayRes: tRes || 0,
        monthRes: mRes || 0,
      });
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderGridMenu = (
    title: string,
    icon: string,
    color: string,
    screenName: string,
    sub: string,
  ) => (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={() => navigation.navigate(screenName)}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <Text style={styles.gridTitle}>{title}</Text>
      <Text style={styles.gridSub}>{sub}</Text>
      <View style={styles.arrowIcon}>
        <Ionicons name="arrow-forward-circle" size={24} color="#E2E8F0" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.minimalHeader}>
        <View>
          <Text style={styles.welcomeText}>안녕하세요, 관리자님</Text>
          <Text style={styles.mainBrandText}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity
          onPress={fetchDashboardData}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🚀 오늘/이번달 통합 요약 카드 */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>📞 신규문의</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.todayValue, { color: "#6366F1" }]}>
                {summary.todayConsult}
              </Text>
              <Text style={styles.unitText}>건 (오늘)</Text>
            </View>
            <Text style={styles.monthValue}>
              이번 달 누적 {summary.monthConsult}건
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>📅 오늘수업</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.todayValue, { color: "#10B981" }]}>
                {summary.todayRes}
              </Text>
              <Text style={styles.unitText}>명 (전체)</Text>
            </View>
            <Text style={styles.monthValue}>
              이번 달 누적 {summary.monthRes}명
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>서비스 관리</Text>

        <View style={styles.gridContainer}>
          {renderGridMenu(
            "신규 상담",
            "chatbubbles-outline",
            "#6366F1",
            "AdminConsultation",
            "상담 및 반배정",
          )}
          {renderGridMenu(
            "회원 관리",
            "person-add-outline",
            "#10B981",
            "AdminMember",
            "정보 및 수강권",
          )}
          {renderGridMenu(
            "이용권 청구",
            "receipt-outline",
            "#EC4899",
            "AdminBilling",
            "이용권 결제 요청",
          )}
          {renderGridMenu(
            "예약 현황",
            "calendar-outline",
            "#F59E0B",
            "AdminSchedule",
            "출석 및 시간표",
          )}
          {/* 🚀 정류장 관리 추가 */}
          {renderGridMenu(
            "정류장 관리",
            "location-outline",
            "#8B5CF6",
            "ManageSpots",
            "승하차 위치 등록",
          )}
          {/* 🚀 이용권 설정 복구 */}
          {renderGridMenu(
            "이용권 설정",
            "options-outline",
            "#64748B",
            "AdminSetting",
            "이용권 및 가격",
          )}
        </View>

        {/* 🚀 하단 배너: 실시간 관제 센터 */}
        <TouchableOpacity
          style={styles.bannerCard}
          onPress={() => navigation.navigate("RealtimeMap")}
        >
          <View style={styles.bannerInfo}>
            <Ionicons
              name="map"
              size={24}
              color="#FFF"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.bannerTitle}>실시간 위치 관제</Text>
            <Text style={styles.bannerSub}>운행 중인 셔틀 위치 모니터링</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color="rgba(255,255,255,0.5)"
          />
        </TouchableOpacity>

        {/* 🚀 기사 대시보드 바로가기 */}
        <TouchableOpacity
          style={{ marginTop: 20, alignItems: "center" }}
          onPress={() => navigation.navigate("DriverDashboard")}
        >
          <Text style={{ color: "#94A3B8", fontSize: 13, fontWeight: "700" }}>
            기사님 전용 대시보드로 이동
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  minimalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 20,
    backgroundColor: "#FFF",
  },
  welcomeText: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  mainBrandText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 40 },

  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 22,
    borderRadius: 28,
    marginTop: 10,
    marginBottom: 25,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  summaryItem: { flex: 1, alignItems: "flex-start", paddingLeft: 5 },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 8,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline" },
  todayValue: { fontSize: 26, fontWeight: "900" },
  unitText: {
    fontSize: 13,
    color: "#94A3B8",
    marginLeft: 4,
    fontWeight: "600",
  },
  monthValue: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
    fontWeight: "500",
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 15,
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 15,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCard: {
    width: COLUMN_WIDTH,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  gridSub: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  arrowIcon: { alignSelf: "flex-end", marginTop: 5 },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 25,
    borderRadius: 24,
    marginTop: 10,
  },
  bannerInfo: { flex: 1 },
  bannerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  bannerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "500",
  },
});