import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { supabase } from "../../lib/supabase";

// 🚀 [추가] 전역 상태 보관소에서 지점 정보 가져오기
import { useAuth } from "../../context/AuthContext";

// 한국어 설정
LocaleConfig.locales["ko"] = {
  monthNames: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  dayNames: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  today: "오늘",
};
LocaleConfig.defaultLocale = "ko";

export default function ReservationScreen({ navigation }: any) {
  // 🚀 [추가] 전역 지점 ID 호출
  const { branchId } = useAuth();

  const insets = useSafeAreaInsets(); // 🚀 하단 안전 영역 값 가져오기

  const [selectedDate, setSelectedDate] = useState(
    dayjs().tz().format("YYYY-MM-DD"),
  );
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // 🚀 예약 처리 중 상태

  // 유저 및 자녀 상태 관리
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allChildren, setAllChildren] = useState<any[]>([]); // 🚀 모든 자녀 목록
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]); // 🚀 사용 가능 이용권 목록

  // 🚀 [추가] 현재 화면에 표시할 지점 이름 상태
  const [displayBranchName, setDisplayBranchName] = useState("");

  // 🚀 모달 및 장바구니 제어 상태
  const [childModalVisible, setChildModalVisible] = useState(false);
  const [packageModalVisible, setPackageModalVisible] = useState(false);
  const [isCartExpanded, setIsCartExpanded] = useState(false); // 🚀 장바구니 펼침 여부

  useEffect(() => {
    fetchInitialData();
  }, []);

  // 🚀 [수정] selectedDate뿐만 아니라 branchId가 바뀔 때도 데이터와 지점명을 다시 불러옵니다.
  useEffect(() => {
    if (branchId) {
      fetchSchedules();
      fetchBranchName(); // 🚀 지점 이름 가져오기 함수 호출
    }
  }, [selectedDate, branchId]);

  // 🚀 [추가] DB에서 현재 branchId에 해당하는 실제 지점명을 가져오는 함수
  const fetchBranchName = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("name")
        .eq("id", branchId)
        .single();

      if (data) {
        setDisplayBranchName(data.name);
      }
    } catch (e) {
      console.log("지점명 로드 실패:", e);
    }
  };

  // 1. 로그인 유저 정보 및 자녀 정보 가져오기
  const fetchInitialData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // 1-1. 유저 프로필 조회 (branch_id 포함)
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      // 1-2. 자녀 정보 조회
      const { data: children } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", user.id);

      if (children && children.length > 0) {
        setAllChildren(children);
        // 초기값은 일단 첫째로 세팅 (화면 상단 표시용)
        setSelectedChild(children[0]);
      } else {
        setAllChildren([]);
        setSelectedChild(null); // 자녀 없음 (성인 본인)
      }
    }
  };

  // 2. 선택 날짜의 시간표 조회
  const fetchSchedules = async () => {
    if (!branchId) return; // 🚀 지점 정보가 없으면 조회를 멈춤

    setLoading(true);
    const dayName = ["일", "월", "화", "수", "목", "금", "토"][
      new Date(selectedDate).getDay()
    ];
    const { data } = await supabase
      .from("class_schedules")
      .select("*")
      .eq("branch_id", branchId) // 🚀 [핵심 필터] 현재 지점의 시간표만 불러옵니다.
      .eq("day_of_week", dayName)
      .eq("is_active", true)
      .order("start_time", { ascending: true });

    setSchedules(data || []);
    setLoading(false);
  };

  // 3. 8자리 생년월일 기반 나이 계산 함수
  const calculateAge = (birthDate: string | null | undefined) => {
    if (!birthDate || birthDate.length !== 8) return 0;
    try {
      const year = parseInt(birthDate.substring(0, 4));
      const currentYear = new Date().getFullYear();
      return currentYear - year + 1; // 한국 나이
    } catch (e) {
      return 0;
    }
  };

  const handleSelectClass = (item: any) => {
    const isSelected = cart.find(
      (c) => c.id === item.id && c.date === selectedDate,
    );
    if (isSelected) {
      const newCart = cart.filter(
        (c) => !(c.id === item.id && c.date === selectedDate),
      );
      setCart(newCart);
      if (newCart.length === 0) setIsCartExpanded(false); // 다 지우면 장바구니 닫기
    } else {
      setCart([...cart, { ...item, date: selectedDate }]);
      setIsCartExpanded(true); // 담으면 장바구니 스르륵 열리기
    }
  };

  // 🚀 장바구니에서 개별 아이템 삭제
  const removeCartItem = (itemId: string, itemDate: string) => {
    const newCart = cart.filter(
      (c) => !(c.id === itemId && c.date === itemDate),
    );
    setCart(newCart);
    if (newCart.length === 0) setIsCartExpanded(false);
  };

  // 🚀 [추가] 상단에서 자녀를 직접 변경하는 기능
  const handleChangeChild = (child: any) => {
    setSelectedChild(child);
    setChildModalVisible(false);
    setCart([]); // 💡 자녀가 바뀌면 장바구니 초기화 (나이가 달라져서 이전 선택이 무효가 됨)
    setIsCartExpanded(false);
    Alert.alert("알림", `${child.child_name}(으)로 대상이 변경되었습니다.`);
  };

  // 🚀 [단계 1] 예약하기 버튼 클릭 시 흐름 시작 (팀장님 요청 로직 반영)
  const handleStartBooking = () => {
    if (cart.length === 0) return;

    if (allChildren.length > 1) {
      // 1️⃣ 자녀가 2명 이상이면 -> 누구 수업인지 물어본다 (모달)
      setChildModalVisible(true);
    } else if (allChildren.length === 1) {
      // 2️⃣ 자녀가 1명이면 -> 자동으로 그 자녀로 이용권 체크
      checkPackagesForAttendee(allChildren[0]);
    } else {
      // 3️⃣ 자녀가 없으면 (성인반) -> 본인으로 이용권 체크
      checkPackagesForAttendee(null);
    }
  };

  // 🚀 [단계 2] 대상자(자녀 또는 본인)의 이용권 확인 (Lock 로직 적용)
  const checkPackagesForAttendee = async (child: any) => {
    setSelectedChild(child);
    setChildModalVisible(false);

    const today = dayjs().tz().format("YYYY-MM-DD");

    // 🚀 핵심 필터링: 아무도 안 쓴 수강권(null)이거나, 이 대상에게 이미 Lock된 수강권만 가져옴
    // 유효기간이 지나지 않은 것, 그리고 수업 예약용이므로 셔틀 전용권은 제외합니다.
    let query = supabase
      .from("user_packages")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("status", "active")
      .gt("remaining_count", 0)
      .gte("expiry_date", today)
      .eq("voucher_type", "lesson");
      

    if (child) {
      // 자녀 수강권: child_id가 비어있거나, 선택한 자녀 ID와 일치하는 것
      query = query.or(`child_id.is.null,child_id.eq.${child.id}`);
    } else {
      // 본인 수강권: child_id가 아예 없는(null) 것만 가져옴
      query = query.is("child_id", null);
    }

    const { data: pkgs, error } = await query.order("created_at", {
      ascending: true,
    });

    if (error || !pkgs || pkgs.length === 0) {
      Alert.alert(
        "알림",
        "사용 가능한 이용권이 없습니다. 먼저 이용권을 구매해주세요.",
      );
      return;
    }

    // 이용권이 여러 개면 선택 모달 오픈
    if (pkgs.length > 1) {
      setAvailablePackages(pkgs);
      setPackageModalVisible(true);
    } else {
      // 이용권이 1개면 바로 최종 예약 진행
      processFinalReservation(child, pkgs[0]);
    }
  };

  // 🚀 [단계 3] 최종 DB 저장, 횟수 차감, 그리고 수강권 Lock 처리 (서버사이드 트랜잭션 함수 perform_bulk_reservation 연동)
  const processFinalReservation = async (child: any, pkg: any) => {
    setPackageModalVisible(false);
    setIsSubmitting(true);

    try {
      const bookingsJson = cart.map((item) => ({
        schedule_id: item.id,
        class_date: item.date,
      }));

      const { data, error } = await supabase.rpc("perform_bulk_reservation", {
        p_user_id: currentUser.id,
        p_child_id: child ? child.id : null,
        p_child_name: child ? child.child_name : `${currentUser.name}(본인)`,
        p_package_id: pkg.id,
        p_branch_id: branchId,
        p_bookings: bookingsJson,
      });

      if (error) throw error;

      if (data && data.success) {
        setCart([]);
        setIsCartExpanded(false);
        navigation.navigate("ReservationSuccess");
      } else {
        Alert.alert("예약 실패", data?.message || "처리에 실패했습니다.");
      }
    } catch (e: any) {
      console.error("예약 오류:", e);
      Alert.alert("오류", e.message || "예약 처리 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetInfo = selectedChild
    ? {
        name: selectedChild.child_name,
        birth: selectedChild.child_birth,
        target: selectedChild.target_class,
      }
    : {
        name: currentUser?.name || "본인",
        birth: currentUser?.birth_date,
        target: null,
      };

  const targetAge = calculateAge(targetInfo.birth);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          {/* 🚀 [수정] 하드코딩된 '시흥본점' 대신 DB에서 실시간으로 가져온 지점명을 보여줍니다. */}
          <Text style={styles.branchName}>
            {displayBranchName || "지점 정보 로딩 중..."}
          </Text>

          <TouchableOpacity
            onPress={() => allChildren.length > 1 && setChildModalVisible(true)}
            style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}
            disabled={allChildren.length <= 1}
          >
            <View style={styles.childInfoBadge}>
              <Text style={styles.childBadgeText}>
                {targetInfo.name} (
                {targetAge > 0 ? `${targetAge}세` : "정보 없음"})
              </Text>
              {allChildren.length > 1 && (
                <Ionicons
                  name="swap-horizontal"
                  size={14}
                  color="#FFF"
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
          </TouchableOpacity>

          {targetInfo.target && (
            <Text style={styles.targetClassInfo}>
              지정반: {targetInfo.target}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.changeChildBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            (isCartExpanded && cart.length > 0 ? 320 : 140) + insets.bottom,
        }}
      >
        <Calendar
          current={selectedDate}
          // 🚀 [추가] 오늘 날짜를 구해서 minDate로 설정합니다.
          minDate={dayjs().tz().format("YYYY-MM-DD")} 
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: "#6366F1" },
          }}
          theme={{
            todayTextColor: "#6366F1",
            arrowColor: "#6366F1",
            textMonthFontWeight: "800",
          }}
        />

        <View style={styles.scheduleContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{selectedDate} 수업 목록</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#6366F1" style={{ marginTop: 30 }} />
          ) : schedules.length === 0 ? (
            <Text style={styles.emptyText}>해당 날짜에 수업이 없습니다.</Text>
          ) : (
            schedules.map((item) => {
              const canReserve = targetInfo.target
                ? targetInfo.target === item.target_class
                : targetAge >= item.min_age && targetAge <= item.max_age;

              const isSelected = cart.find(
                (c) => c.id === item.id && c.date === selectedDate,
              );

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.classCard,
                    isSelected && styles.selectedCard,
                    !canReserve && styles.disabledCard,
                  ]}
                  onPress={() =>
                    canReserve
                      ? handleSelectClass(item)
                      : Alert.alert("예약 불가", "수강 대상이 아닙니다.")
                  }
                  disabled={!canReserve && !isSelected}
                >
                  <View style={styles.classInfo}>
                    <Text
                      style={[
                        styles.timeText,
                        !canReserve && styles.disabledText,
                      ]}
                    >
                      {item.start_time.slice(0, 5)} -{" "}
                      {item.end_time.slice(0, 5)}
                    </Text>
                    <Text
                      style={[
                        styles.classNameText,
                        !canReserve && styles.disabledText,
                      ]}
                    >
                      {item.target_class} ({item.min_age}~{item.max_age}세)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isSelected && styles.selectedBadge,
                      !canReserve && styles.disabledBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isSelected && styles.selectedStatusText,
                        !canReserve && styles.disabledStatusText,
                      ]}
                    >
                      {isSelected
                        ? "선택됨"
                        : canReserve
                          ? "예약가능"
                          : "대상아님"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 🚀 스택 장바구니 + 예약 푸터 통합 UI */}
      <View
        style={[
          styles.footerWrapper,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        {/* 장바구니 헤더 (토글) */}
        <TouchableOpacity
          style={styles.cartToggleHeader}
          onPress={() => cart.length > 0 && setIsCartExpanded(!isCartExpanded)}
          activeOpacity={0.8}
        >
          <Text style={styles.cartToggleText}>
            {cart.length > 0
              ? `🛒 예약 바구니에 ${cart.length}건 담김`
              : "🛒 예약할 수업을 눌러주세요"}
          </Text>
          {cart.length > 0 && (
            <Ionicons
              name={isCartExpanded ? "chevron-down" : "chevron-up"}
              size={20}
              color="#64748B"
            />
          )}
        </TouchableOpacity>

        {/* 🚀 펼쳐지는 장바구니 리스트 영역 */}
        {isCartExpanded && cart.length > 0 && (
          <View style={styles.cartListContainer}>
            <ScrollView
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={false}
            >
              {cart.map((cartItem, index) => (
                <View key={index} style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>
                      {cartItem.target_class} 수업
                    </Text>
                    <Text style={styles.cartItemDesc}>
                      {cartItem.date.slice(5)} (
                      {cartItem.start_time.slice(0, 5)} -{" "}
                      {cartItem.end_time.slice(0, 5)})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeCartItem(cartItem.id, cartItem.date)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="close-circle" size={24} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 하단 예약하기 버튼 영역 */}
        <View style={styles.payBar}>
          <TouchableOpacity
            onPress={() => {
              setCart([]);
              setIsCartExpanded(false);
            }}
          >
            <Text style={styles.resetText}>
              {cart.length > 0 ? "비우기" : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mainActionBtn,
              cart.length === 0 && { backgroundColor: "#94A3B8" }, // 안 담겼을 때 회색 처리
              isSubmitting && { opacity: 0.7 },
            ]}
            onPress={handleStartBooking}
            disabled={isSubmitting || cart.length === 0}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.mainActionText}>선택 수업 예약하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 🚀 자녀 선택 모달 */}
      <Modal
        visible={childModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChildModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(insets.bottom + 20, 25) },
            ]}
          >
            <Text style={styles.modalTitle}>누구의 수업을 예약할까요?</Text>
            {allChildren.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={styles.modalItem}
                onPress={
                  () =>
                    cart.length > 0
                      ? checkPackagesForAttendee(child) // 장바구니에 담긴 게 있으면 예약 진행
                      : handleChangeChild(child) // 장바구니가 비었으면 그냥 대상 전환
                }
              >
                <Text style={styles.modalItemText}>{child.child_name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setChildModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={{ color: "#94A3B8", fontWeight: "bold" }}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🚀 이용권 선택 모달 */}
      <Modal
        visible={packageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPackageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(insets.bottom + 20, 25) },
            ]}
          >
            <Text style={styles.modalTitle}>사용할 이용권을 선택하세요</Text>
            {availablePackages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={styles.modalItem}
                onPress={() => processFinalReservation(selectedChild, pkg)}
              >
                <Text style={styles.modalItemText}>
                  {pkg.package_name} ({pkg.remaining_count}회 남음)
                </Text>
                {pkg.child_id && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6366F1",
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    [{pkg.child_name} 전용]
                  </Text>
                )}
                {!pkg.child_id && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#F59E0B",
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    [공용 이용권]
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setPackageModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={{ color: "#94A3B8", fontWeight: "bold" }}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  branchName: { fontSize: 18, fontWeight: "800", color: "#111827" },
  childInfoBadge: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  childBadgeText: { fontSize: 13, color: "#FFF", fontWeight: "700" },
  targetClassInfo: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  changeChildBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  scheduleContainer: { padding: 20 },
  listHeader: { marginBottom: 20 },
  listTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  emptyText: { textAlign: "center", color: "#94A3B8", marginTop: 40 },
  classCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  selectedCard: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
  },
  disabledCard: {
    backgroundColor: "#F1F5F9",
    opacity: 0.5,
    borderColor: "#E2E8F0",
  },
  classInfo: { flex: 1 },
  timeText: { fontSize: 16, fontWeight: "800", color: "#111827" },
  disabledText: { color: "#94A3B8" },
  classNameText: { fontSize: 14, color: "#64748B", marginTop: 4 },
  statusBadge: {
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedBadge: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  statusText: { fontSize: 12, fontWeight: "bold", color: "#64748B" },
  selectedStatusText: { color: "#FFF" },
  disabledStatusText: { color: "#94A3B8" },
  disabledBadge: { backgroundColor: "#E2E8F0", borderColor: "#CBD5E1" },

  footerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  cartToggleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cartToggleText: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cartListContainer: { marginTop: 10, marginBottom: 20 },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  cartItemName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cartItemDesc: {
    fontSize: 13,
    color: "#6366F1",
    marginTop: 4,
    fontWeight: "700",
  },
  deleteBtn: { padding: 4 },
  payBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  resetText: { color: "#94A3B8", fontWeight: "600", paddingHorizontal: 10 },
  mainActionBtn: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    flex: 1,
    marginLeft: 15,
    alignItems: "center",
  },
  mainActionText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: 25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  modalItem: {
    padding: 20,
    backgroundColor: "#F1F5F9",
    borderRadius: 15,
    marginBottom: 10,
  },
  modalItemText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  closeBtn: { marginTop: 10, padding: 15, alignItems: "center" },
});
