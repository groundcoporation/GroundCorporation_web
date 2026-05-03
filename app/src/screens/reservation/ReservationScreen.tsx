import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

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
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<any[]>([]);

  // 유저 및 자녀 상태 관리
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedChild, setSelectedChild] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [selectedDate]);

  // 1. 로그인 유저 정보 및 자녀 정보 가져오기
  const fetchInitialData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // 1-1. 유저 프로필 조회 (birth_date: 19940101 형식)
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      // 1-2. 자녀 정보 조회 (child_birth: 20180510 형식)
      const { data: children } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", user.id);
      if (children && children.length > 0) {
        setSelectedChild(children[0]); // 첫 번째 자녀 기본 선택
      }
    }
  };

  // 2. 선택 날짜의 시간표 조회
  const fetchSchedules = async () => {
    setLoading(true);
    const dayName = ["일", "월", "화", "수", "목", "금", "토"][
      new Date(selectedDate).getDay()
    ];
    const { data } = await supabase
      .from("class_schedules")
      .select("*")
      .eq("day_of_week", dayName)
      .eq("is_active", true)
      .order("start_time", { ascending: true });

    setSchedules(data || []);
    setLoading(false);
  };

  // 3. 8자리 생년월일(YYYYMMDD) 기반 나이 계산 함수
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
      setCart(
        cart.filter((c) => !(c.id === item.id && c.date === selectedDate)),
      );
    } else {
      setCart([...cart, { ...item, date: selectedDate }]);
    }
  };

  // 💡 [핵심 로직] 예약 대상 및 나이 결정
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
      {/* 상단 헤더: 지점 및 대상 정보 */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.branchName}>시흥본점</Text>
          <Text style={styles.childBadge}>
            대상: {targetInfo.name} (
            {targetAge > 0 ? `${targetAge}세` : "연령 정보 없음"})
          </Text>
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 달력 영역 */}
        <Calendar
          current={selectedDate}
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

        {/* 시간표 목록 영역 */}
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
              // ⭐️ 예약 가능 조건 체크
              // 1. 지정반이 있다면 -> 지정반 이름이 일치해야 함
              // 2. 지정반이 없다면 -> 나이가 범위 내에 있어야 함
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

      {/* 하단 플로팅 장바구니 */}
      {cart.length > 0 && (
        <View style={styles.bookingBar}>
          <View style={styles.bookingInfo}>
            <Text style={styles.totalCount}>총 {cart.length}건 선택됨</Text>
            <TouchableOpacity onPress={() => setCart([])}>
              <Text style={styles.resetText}>초기화</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => navigation.navigate("ReservationSuccess")}
          >
            <Text style={styles.confirmBtnText}>선택 수업 예약하기</Text>
          </TouchableOpacity>
        </View>
      )}
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
  childBadge: {
    fontSize: 13,
    color: "#6366F1",
    fontWeight: "600",
    marginTop: 2,
  },
  targetClassInfo: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  changeChildBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  scheduleContainer: { padding: 20, paddingBottom: 120 },
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
  selectedCard: { borderColor: "#6366F1", backgroundColor: "#EEF2FF" },
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
  disabledBadge: { backgroundColor: "#E2E8F0", borderColor: "#CBD5E1" },
  statusText: { fontSize: 12, fontWeight: "bold", color: "#64748B" },
  selectedStatusText: { color: "#FFF" },
  disabledStatusText: { color: "#94A3B8" },
  bookingBar: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 20,
    elevation: 10,
  },
  bookingInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  totalCount: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  resetText: { color: "#94A3B8" },
  confirmBtn: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
