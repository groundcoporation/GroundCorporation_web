import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // 👈 팀장님 프로젝트의 supabase 설정 경로

export default function PickupMainScreen({ navigation }: any) {
  // 💡 이용권 보유 상태 (null: 확인 중, false: 없음, true: 있음)
  const [hasPickupPass, setHasPickupPass] = useState<boolean | null>(null);

  // 실시간 상태 관리
  const [isDriving, setIsDriving] = useState(false); // 기사님 운행 여부
  const [pickupInfo, setPickupInfo] = useState<any>(null); // 내 픽업 설정 정보[cite: 2]
  const [loading, setLoading] = useState(true);
  const [isPassModalVisible, setIsPassModalVisible] = useState(false); // 🚀 이용권 안내 팝업 상태

  // 테스트용 아이 UUID (DB의 실제 UUID로 교체해서 테스트하세요)
  const TEST_CHILD_ID = "550e8400-e29b-41d4-a716-446655440000";

  // 1. DB에서 실시간 데이터 및 설정 정보 가져오기
  const fetchLiveStatus = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // (1) 셔틀버스 월 이용권 보유 여부 확인 (user_packages 테이블)
      // 💡 [수정] 이모지나 특수문자가 섞인 긴 패키지명도 '셔틀' 글자만 있으면 찾을 수 있게 ilike를 유지하되,
      // DB 쿼리에서 날짜 비교(.gte)를 제거하여 expiry_date가 null인 항목이 누락되는 현상을 방지합니다.
      const { data: passData } = await supabase
        .from("user_packages")
        .select("id, package_name, expiry_date")
        .eq("user_id", user.id) // 사용자 ID는 정확히 일치해야 합니다.
        .ilike("status", "active") // status 필드를 대소문자 구분 없이 'active'로 검색합니다.
        .ilike("package_name", "%셔틀%");

      // 💡 오늘 날짜 (시간 제외)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 💡 [검증 로직] 유효기간이 아예 없거나(NULL), 유효기간이 오늘 이후인 이용권이 하나라도 있는지 확인
      const passExists = !!(
        passData &&
        passData.length > 0 &&
        passData.some((pkg) => {
          if (!pkg.expiry_date) return true; // 유효기간이 설정되지 않은 데이터는 유효한 것으로 간주

          const expiry = new Date(pkg.expiry_date);
          return expiry >= today;
        })
      );

      setHasPickupPass(passExists);

      // 이용권이 없는 경우 즉시 팝업 노출
      if (!passExists) {
        setIsPassModalVisible(true);
        setLoading(false);
        return;
      }

      // (2) 기사님 운행 상태 확인 (shuttle_status 테이블)[cite: 2]
      const { data: shuttleData } = await supabase
        .from("shuttle_status")
        .select("is_driving")
        .eq("is_driving", true)
        .limit(1)
        .single();
      setIsDriving(!!shuttleData);

      // (3) 내 픽업 설정 정보 확인 (pickup_settings 테이블)[cite: 2]
      const { data: settingsData } = await supabase
        .from("pickup_settings")
        .select("*")
        .eq("child_id", TEST_CHILD_ID)
        .single();
      setPickupInfo(settingsData);
    } catch (error) {
      console.log("데이터 조회 실패 또는 데이터 없음:", error);
      setPickupInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 [핵심 수정] 구매 화면에서 뒤로가기로 돌아왔을 때를 대비해, 화면이 포커스될 때마다 이용권 체크
  useFocusEffect(
    useCallback(() => {
      fetchLiveStatus();
    }, []),
  );

  useEffect(() => {
    // 💡 셔틀 운행 상태 실시간 감시 (기사님이 상태 변경 시 즉시 반영)[cite: 2]
    const shuttleSubscription = supabase
      .channel("live_shuttle_main")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shuttle_status" },
        fetchLiveStatus,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(shuttleSubscription);
    };
  }, []);

  if (loading || hasPickupPass === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        {hasPickupPass === null && (
          <Text style={{ marginTop: 10, color: "#64748B" }}>
            이용권 확인 중...
          </Text>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 🚀 이용권 구매 유도 팝업 (요청하신 문구 및 이동 로직 적용) */}
      <Modal visible={isPassModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBg}>
              <MaterialCommunityIcons
                name="bus-alert"
                size={40}
                color="#6366F1"
              />
            </View>
            <Text style={styles.modalTitle}>셔틀버스 이용권 필요</Text>
            <Text style={styles.modalDesc}>
              셔틀버스 이용을 위해서는{"\n"}셔틀버스 월 이용권 구매를
              해야합니다.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => {
                setIsPassModalVisible(false);
                navigation.navigate("Pass"); // 구매 스크린으로 이동
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>
                셔틀버스 이용권 구매하러 가기
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setIsPassModalVisible(false);
                navigation.goBack(); // 이용권 없으면 이전 화면으로 강제 퇴장
              }}
            >
              <Text style={styles.modalCloseBtnText}>나중에 할게요</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 상단 앱바 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>픽업 관리</Text>
        <TouchableOpacity onPress={() => navigation.navigate("PickupApply")}>
          <Ionicons name="settings-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. 실시간 셔틀 위치 카드[cite: 2] */}
        <View
          style={[
            styles.statusCard,
            isDriving ? styles.activeCard : styles.inactiveCard,
          ]}
        >
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isDriving ? "#EF4444" : "#94A3B8" },
              ]}
            />
            <Text style={styles.statusText}>
              {isDriving ? "실시간 운행 중" : "운행 대기"}
            </Text>
          </View>
          <Text style={styles.cardTitle}>
            {isDriving
              ? "셔틀버스가 이동 중입니다"
              : "현재 운행 중인 셔틀이 없습니다"}
          </Text>

          <TouchableOpacity
            style={[styles.mapBtn, !isDriving && styles.disabledBtn]}
            onPress={() => isDriving && navigation.navigate("RealtimeMap")}
            disabled={!isDriving}
          >
            <Text style={styles.mapBtnText}>실시간 위치 확인하기</Text>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={20}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {/* 2. 내 픽업 정보 요약 (DB 데이터 반영)[cite: 2] */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>나의 픽업 정보</Text>
          <View style={styles.infoCard}>
            {pickupInfo ? (
              <>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="bus-side"
                    size={20}
                    color="#6366F1"
                  />
                  <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>
                      {pickupInfo.area} 탑승지
                    </Text>
                    <Text style={styles.infoValue}>
                      {pickupInfo.apartment} {pickupInfo.detail_location}
                    </Text>
                  </View>
                </View>
                <View style={[styles.infoRow, { marginTop: 15 }]}>
                  <MaterialCommunityIcons
                    name="home-export-outline"
                    size={20}
                    color="#10B981"
                  />
                  <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>하원 정보</Text>
                    <Text style={styles.infoValue}>
                      지정된 장소에서 하차 (등원과 동일)
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.emptyInfoContainer}
                onPress={() => navigation.navigate("PickupApply")}
              >
                <Ionicons name="add-circle-outline" size={32} color="#6366F1" />
                <Text style={styles.emptyInfoText}>
                  등록된 픽업 정보가 없습니다.{"\n"}여기를 눌러 정보를
                  설정해주세요.
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. 예외 처리 버튼 (하원 방식 변경)[cite: 1, 2] */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            Alert.alert(
              "준비 중",
              "오늘의 하원 방식 변경 기능은 곧 업데이트됩니다.",
            )
          }
        >
          <Text style={styles.actionBtnText}>오늘 하원 방식 변경하기</Text>
          <Ionicons name="swap-horizontal" size={20} color="#6366F1" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 20 },

  statusCard: { padding: 24, borderRadius: 20, marginBottom: 25 },
  activeCard: { backgroundColor: "#1E293B" },
  inactiveCard: { backgroundColor: "#E2E8F0" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  cardTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    lineHeight: 28,
  },

  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 15,
    borderRadius: 12,
  },
  disabledBtn: { backgroundColor: "#94A3B8" },
  mapBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 8,
  },

  infoSection: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoTexts: { marginLeft: 12 },
  infoLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  infoValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "800",
    marginTop: 2,
  },

  emptyInfoContainer: { alignItems: "center", paddingVertical: 10 },
  emptyInfoText: {
    color: "#6366F1",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6366F1",
    borderStyle: "dashed",
  },
  actionBtnText: {
    color: "#6366F1",
    fontSize: 15,
    fontWeight: "800",
    marginRight: 8,
  },

  /* 🚀 추가된 팝업 UI 스타일 */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalPrimaryBtn: {
    width: "100%",
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  modalPrimaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  modalCloseBtn: { paddingVertical: 10 },
  modalCloseBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
