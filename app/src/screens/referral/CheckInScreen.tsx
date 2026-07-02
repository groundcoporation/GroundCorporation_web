import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const { width } = Dimensions.get("window");

export default function CheckInScreen({ navigation }: any) {
  const { user } = useAuth();

  const [eventData, setEventData] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [checkInLogs, setCheckInLogs] = useState<any[]>([]); // 🚀 추가: 출석 로그들

  // 출석 완료 후 모달 제어용
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({
    points: 0,
    progress: 0,
    char: "",
  });

  const spellingArray = eventData?.config?.spelling || ["아", "이", "패", "스", "케", "어", "성공"];
  const spellingWord = spellingArray.slice(0, -1).join("");

  useEffect(() => {
    if (user) {
      loadEventAndProgress();
    }
  }, [user]);

  const loadEventAndProgress = async () => {
    setLoading(true);
    try {
      // 1. 활성화된 출석체크 이벤트 조회
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("event_type", "attendance")
        .eq("is_active", true)
        .maybeSingle();

      if (eventError) throw eventError;

      if (event) {
        setEventData(event);

        // 2. 유저 진행도 조회
        const { data: part, error: partError } = await supabase
          .from("event_participants")
          .select("*")
          .eq("event_id", event.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (partError) throw partError;
        setParticipant(part);

        // 🚀 출석체크 로그 조회 추가 (완료된 일자의 획득 포인트 매핑용)
        if (part) {
          const { data: logs } = await supabase
            .from("event_logs")
            .select("earned_points, action_date")
            .eq("participant_id", part.id)
            .order("created_at", { ascending: true });
          
          if (logs) {
            setCheckInLogs(logs);
          }
        } else {
          setCheckInLogs([]);
        }
      }

      // 3. 현재 보유 포인트 최신 조회
      const { data: profile } = await supabase
        .from("users")
        .select("points")
        .eq("id", user.id)
        .single();
      if (profile) {
        setUserPoints(profile.points || 0);
      }

    } catch (e: any) {
      console.error("출석 이벤트 조회 에러:", e);
      Alert.alert("오류", "출석체크 정보를 불러오는 도중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 현재 화면에 표시할 도장 찍힌 개수 계산 (streak 판정 포함)
  const getDisplayProgress = () => {
    if (!participant) return 0;

    const todayStr = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
    const yesterdayStr = dayjs().tz("Asia/Seoul").subtract(1, "day").format("YYYY-MM-DD");
    const lastDate = participant.last_action_date;
    const targetStreak = eventData?.config?.target_count || spellingArray.length;

    // 마지막 출석이 오늘이거나 어제인 경우에만 진행 상태 유지
    if (lastDate === todayStr || lastDate === yesterdayStr) {
      // 완료한 상태인데 어제 완료했다면, 오늘 방문 시에는 0개 도장으로 표시 (새로운 주기를 시작할 것이기 때문)
      if (participant.current_progress === targetStreak && lastDate === yesterdayStr) {
        return 0;
      }
      return participant.current_progress;
    }

    // 어제 출석을 안 했다면 연속 출석 실패(리셋 상태)이므로 도장 0개로 표시
    return 0;
  };

  const displayProgress = getDisplayProgress();
  const todayStr = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
  const alreadyCheckedInToday = participant?.last_action_date === todayStr;
  const activeCycleLogs = displayProgress > 0 ? checkInLogs.slice(-displayProgress) : [];

  // 출석체크 버튼 클릭 핸들러
  const handleCheckIn = async () => {
    if (!eventData) {
      Alert.alert("알림", "진행 중인 출석체크 이벤트가 없습니다.");
      return;
    }

    if (alreadyCheckedInToday) {
      Alert.alert("알림", "오늘은 이미 출석체크를 완료하셨습니다.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("perform_event_check_in", {
        p_user_id: user.id,
        p_event_id: eventData.id,
      });

      if (error) throw error;

      if (data && data.success) {
        // 결과 모달 세팅 및 열기
        setSuccessInfo({
          points: data.earned_points,
          progress: data.current_progress,
          char: data.spelling_char,
        });
        setShowSuccessModal(true);

        // 로컬 상태 다시 불러오기
        await loadEventAndProgress();
      } else {
        Alert.alert("출석 실패", data?.message || "처리에 실패했습니다.");
      }
    } catch (e: any) {
      console.error("출석 처리 에러:", e);
      Alert.alert("오류", e.message || "출석체크 처리 도중 예기치 못한 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !eventData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>출석체크 이벤트</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("PointHistory")}
          style={styles.historyBtn}
        >
          <MaterialCommunityIcons name="history" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 상단 기획 소개 카드 */}
        <View style={styles.eventInfoCard}>
          <View style={styles.badgeRow}>
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>매일 적립</Text>
            </View>
            <Text style={styles.pointsTotalText}>현재 포인트: {userPoints.toLocaleString()} P</Text>
          </View>
          <Text style={styles.eventTitle}>아이패스케어 한글 모으기</Text>
          <Text style={styles.eventDesc}>
            하루도 빠짐없이 {spellingArray.length}일 연속 출석체크하면{"\n"}
            <Text style={styles.accentText}>'{spellingWord}'</Text> 한글을 한 자씩 모아{"\n"}
            {spellingArray.length}일차 성공 시 <Text style={styles.accentText}>{eventData?.config?.completion_reward || 30}P 보너스</Text>를 즉시 적립해 드려요!
          </Text>
          <View style={styles.infoTipRow}>
            <Ionicons name="information-circle-outline" size={16} color="#64748B" />
            <Text style={styles.infoTipText}>1~{spellingArray.length - 1}일차는 {eventData?.config?.daily_reward_range?.[0] || 1}~{eventData?.config?.daily_reward_range?.[1] || 10}포인트 랜덤 지급 / 연속 출석 실패 시 초기화</Text>
          </View>
        </View>

        {/* 7일 스탬프 판 */}
        <View style={styles.stampBoard}>
          <Text style={styles.boardTitle}>나의 출석 도장판</Text>
          
          <View style={styles.stampGrid}>
            {spellingArray.map((char: string, index: number) => {
              const isStamped = displayProgress > index;
              const isCurrent = displayProgress === index && !alreadyCheckedInToday;
              const earnedPoints = isStamped ? activeCycleLogs[index]?.earned_points : null;

              return (
                <View
                  key={index}
                  style={[
                    styles.stampItem,
                    isStamped && styles.stampedItem,
                    isCurrent && styles.currentItem,
                    char === "성공" && styles.successStamp,
                    char === "성공" && isStamped && styles.successStampedItem,
                  ]}
                >
                  <View style={styles.dayBadge}>
                    <Text style={[styles.dayBadgeText, isStamped && styles.textWhite]}>
                      {index + 1}일차
                    </Text>
                  </View>

                  {char === "성공" ? (
                    <View style={styles.stampCenter}>
                      <MaterialCommunityIcons
                        name={isStamped ? "trophy" : "trophy-outline"}
                        size={isStamped ? 28 : 32}
                        color={isStamped ? "#FFFFFF" : "#CBD5E1"}
                      />
                      <Text style={[styles.stampChar, isStamped ? styles.textWhite : styles.textGray, { fontSize: isStamped ? 16 : 24, marginTop: isStamped ? 2 : 6 }]}>
                        성공
                      </Text>
                      {isStamped && earnedPoints && (
                        <View style={styles.pointsPillSuccess}>
                          <Text style={styles.pointsPillTextSuccess}>+{earnedPoints} P</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.stampCenter}>
                      <Text style={[styles.stampChar, isStamped ? styles.textWhite : styles.textGray, isCurrent && styles.textCurrent]}>
                        {char}
                      </Text>
                      {isStamped && earnedPoints && (
                        <View style={styles.pointsPill}>
                          <Text style={styles.pointsPillText}>+{earnedPoints} P</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {isCurrent && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>오늘</Text>
                    </View>
                  )}

                  {isStamped && (
                    <View style={styles.checkIconBadge}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* 출석체크 버튼 */}
        <TouchableOpacity
          style={[
            styles.checkInBtn,
            alreadyCheckedInToday && styles.checkInBtnDisabled,
          ]}
          onPress={handleCheckIn}
          disabled={alreadyCheckedInToday}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.checkInBtnText}>
                {alreadyCheckedInToday ? "오늘의 출석 완료" : "오늘의 출석체크 하기"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* 출석 성공 축하 팝업 모달 */}
      <Modal visible={showSuccessModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconBg}>
              <Ionicons name="gift" size={40} color="#FFFFFF" />
            </View>

            <Text style={styles.modalTitle}>오늘의 출석체크 완료! 🎉</Text>
            
            <View style={styles.spellingBadge}>
              <Text style={styles.spellingBadgeText}>
                스펠링 글자 '{successInfo.char}' 획득
              </Text>
            </View>

            <View style={styles.pointRewardCard}>
              <Text style={styles.pointRewardLabel}>적립된 포인트</Text>
              <Text style={styles.pointRewardVal}>+{successInfo.points} P</Text>
            </View>

            <Text style={styles.modalSubText}>
              {successInfo.progress === spellingArray.length
                ? `축하합니다! ${spellingArray.length}일 완료 스탬프 완성 보상을 획득하셨습니다.`
                : `현재 연속 ${successInfo.progress}일차 출석 성공! 내일도 출석해주세요.`}
            </Text>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setShowSuccessModal(false);
              }}
            >
              <Text style={styles.modalCloseBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
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
  historyBtn: { padding: 4, marginRight: -4 },
  
  scrollContent: { padding: 20 },
  
  eventInfoCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  eventBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventBadgeText: { fontSize: 12, fontWeight: "700", color: "#4F46E5" },
  pointsTotalText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  eventTitle: { fontSize: 22, fontWeight: "900", color: "#1E293B", marginBottom: 10 },
  eventDesc: { fontSize: 14, color: "#475569", lineHeight: 22, fontWeight: "500" },
  accentText: { color: "#4F46E5", fontWeight: "800" },
  infoTipRow: { flexDirection: "row", alignItems: "center", marginTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14 },
  infoTipText: { fontSize: 11, color: "#64748B", marginLeft: 6, fontWeight: "600" },
  
  stampBoard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  boardTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginBottom: 20 },
  stampGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  stampItem: {
    width: (width - 100) / 3, // 3열 배치
    height: 105,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  stampedItem: {
    borderColor: "#4F46E5",
    backgroundColor: "#6366F1",
  },
  currentItem: {
    borderColor: "#818CF8",
    borderStyle: "dashed",
    backgroundColor: "#EEF2FF",
  },
  successStamp: {
    width: "100%", // 7일차 완료 스탬프는 가로 전체 크기로 노출
    height: 90,
  },
  successStampedItem: {
    borderColor: "#F59E0B",
    backgroundColor: "#F59E0B",
  },
  dayBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dayBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
  },
  stampCenter: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  stampChar: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },
  textWhite: { color: "#FFF" },
  textGray: { color: "#94A3B8" },
  checkIconBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    backgroundColor: "#FFF",
    borderRadius: 10,
  },
  
  checkInBtn: {
    flexDirection: "row",
    backgroundColor: "#4F46E5",
    paddingVertical: 18,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: 40,
  },
  checkInBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  checkInBtnText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  
  // 성공 팝업 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFF",
    width: "100%",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
  },
  successIconBg: {
    width: 72,
    height: 72,
    backgroundColor: "#6366F1",
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#1E293B", marginBottom: 12 },
  spellingBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  spellingBadgeText: { fontSize: 14, fontWeight: "700", color: "#4F46E5" },
  pointRewardCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  pointRewardLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 4 },
  pointRewardVal: { fontSize: 28, fontWeight: "900", color: "#F59E0B" },
  modalSubText: { fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  modalCloseBtn: {
    width: "100%",
    backgroundColor: "#1E293B",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  modalCloseBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  textCurrent: {
    color: "#6366F1",
  },
  pointsPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: "#F59E0B",
  },
  pointsPillText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#D97706",
  },
  pointsPillSuccess: {
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: "#F59E0B",
  },
  pointsPillTextSuccess: {
    fontSize: 11,
    fontWeight: "900",
    color: "#D97706",
  },
  todayBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
