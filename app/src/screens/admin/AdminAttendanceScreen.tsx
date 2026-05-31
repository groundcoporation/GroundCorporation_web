import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
// 🚀 중요: SafeAreaView를 걷어내고 기기별 두께를 계산할 useSafeAreaInsets만 사용합니다.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext";
import { sendGlobalPushNotification } from "../../services/notificationService";

interface AttendeeInfo {
  id: string;
  name: string;
  birthDate: string;
  type: "child" | "parent";
  parentId?: string;
  parentName?: string;
  targetClass?: string;
}

const { height } = Dimensions.get("window");

const AdminAttendanceScreen: React.FC<any> = ({ navigation }) => {
  const { branchId: selectedBranchId } = useAuth();
  // 🚀 안전 영역 픽셀 인셋 계산 훅 선언
  const insets = useSafeAreaInsets();

  const [keypadInput, setKeypadInput] = useState("");
  const [searchResults, setSearchResults] = useState<AttendeeInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeInfo | null>(
    null,
  );
  const [isLoggingAttendance, setIsLoggingAttendance] = useState(false);

  const handleKeypadPress = (digit: string) => {
    if (keypadInput.length < 4) {
      setKeypadInput((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setKeypadInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setKeypadInput("");
    setSearchResults([]);
    setSelectedAttendee(null);
  };

  const checkValidReservationForAttendee = useCallback(
    async (attendee: AttendeeInfo): Promise<boolean> => {
      const today = dayjs().tz().format("YYYY-MM-DD");
      const now = dayjs().tz();

      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select("*, class_schedules(start_time, end_time)")
        .eq(attendee.type === "child" ? "child_id" : "user_id", attendee.id)
        .eq("class_date", today)
        .neq("status", "canceled");

      if (resError) {
        console.error("Error checking reservation for attendee:", resError);
        return false;
      }

      const validReservation = reservations?.find((res: any) => {
        const sched = res.class_schedules;
        if (!sched) return false;

        const startTime = dayjs(`${today} ${sched.start_time}`);
        const endTime = dayjs(`${today} ${sched.end_time}`);

        return (
          now.isAfter(startTime.subtract(10, "minute")) &&
          now.isBefore(endTime.add(10, "minute"))
        );
      });

      return !!validReservation;
    },
    [],
  );

  const searchAttendees = useCallback(
    async (last4Digits: string) => {
      setSearchLoading(true);
      setSearchResults([]);
      setSelectedAttendee(null);

      try {
        const potentialResults: AttendeeInfo[] = [];

        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, phone, birth_date, target_class")
          .eq("branch_id", selectedBranchId)
          .ilike("phone", `%${last4Digits}`);

        if (usersError) throw usersError;

        if (usersData && usersData.length > 0) {
          for (const user of usersData) {
            const { data: childrenData, error: childrenError } = await supabase
              .from("children")
              .select("id, child_name, child_birth, target_class")
              .eq("parent_id", user.id);

            if (childrenError) throw childrenError;

            if (childrenData && childrenData.length > 0) {
              for (const child of childrenData) {
                potentialResults.push({
                  id: child.id,
                  name: child.child_name,
                  birthDate: child.child_birth,
                  type: "child",
                  parentId: user.id,
                  parentName: user.name,
                  targetClass: child.target_class,
                });
              }
            } else {
              potentialResults.push({
                id: user.id,
                name: user.name,
                birthDate: user.birth_date,
                type: "parent",
                targetClass: user.target_class,
              });
            }
          }
        }

        const filteredResults: AttendeeInfo[] = [];
        for (const attendee of potentialResults) {
          const hasValidReservation =
            await checkValidReservationForAttendee(attendee);
          if (hasValidReservation) {
            filteredResults.push(attendee);
          }
        }

        const uniqueResults = Array.from(
          new Map(
            filteredResults.map((item) => [item.id + item.type, item]),
          ).values(),
        );
        setSearchResults(uniqueResults);

        if (uniqueResults.length === 1) {
          setSelectedAttendee(uniqueResults[0]);
        }
      } catch (error: any) {
        console.error("Attendee search failed:", error.message);
        Alert.alert("오류", "사용자 검색 중 문제가 발생했습니다.");
      } finally {
        setSearchLoading(false);
      }
    },
    [selectedBranchId, checkValidReservationForAttendee],
  );

  useEffect(() => {
    if (keypadInput.length === 4) {
      searchAttendees(keypadInput);
    } else {
      setSearchResults([]);
      setSelectedAttendee(null);
    }
  }, [keypadInput, selectedBranchId, searchAttendees]);

  const calculateAge = (birthDate: string | null | undefined) => {
    if (!birthDate || birthDate.length !== 8) return 0;
    try {
      const year = parseInt(birthDate.substring(0, 4), 10);
      const currentYear = dayjs().tz().year();
      return currentYear - year + 1;
    } catch (e) {
      return 0;
    }
  };

  const handleAttendanceAction = async (status: "등원" | "하원") => {
    if (!selectedAttendee) {
      Alert.alert("알림", "출결할 대상을 선택해주세요.");
      return;
    }
    if (!selectedBranchId) {
      Alert.alert("오류", "지점 정보가 없습니다. 관리자에게 문의하세요.");
      return;
    }

    setIsLoggingAttendance(true);
    try {
      const today = dayjs().tz().format("YYYY-MM-DD");
      const currentTime = dayjs().tz().toISOString();
      const now = dayjs().tz();

      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select("*, class_schedules(start_time, end_time)")
        .eq(
          selectedAttendee.type === "child" ? "child_id" : "user_id",
          selectedAttendee.id,
        )
        .eq("class_date", today)
        .neq("status", "canceled");

      if (resError) throw resError;

      const validReservation = reservations?.find((res: any) => {
        const sched = res.class_schedules;
        if (!sched) return false;

        const startTime = dayjs(`${today} ${sched.start_time}`);
        const endTime = dayjs(`${today} ${sched.end_time}`);

        return (
          now.isAfter(startTime.subtract(10, "minute")) &&
          now.isBefore(endTime.add(10, "minute"))
        );
      });

      if (!validReservation) {
        Alert.alert(
          "출결 불가",
          "현재 시간대에 예약된 수업이 없거나 출결 가능 시간이 아닙니다.\n(수업 시작/종료 10분 전후만 가능)",
        );
        return;
      }

      await supabase
        .from("reservations")
        .update({ attendance_status: status })
        .eq("id", validReservation.id);

      const { data: existingLog, error: fetchError } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("child_id", selectedAttendee.id)
        .eq("date", today)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingLog) {
        const updateData: {
          check_in?: string;
          check_out?: string;
          status?: string;
        } = {};
        if (status === "등원") {
          updateData.check_in = currentTime;
          updateData.status = "등원";
        } else {
          updateData.check_out = currentTime;
          updateData.status = "하원";
        }

        const { error: updateError } = await supabase
          .from("attendance_logs")
          .update(updateData)
          .eq("id", existingLog.id);

        if (updateError) throw updateError;
      } else {
        const insertData = {
          child_id: selectedAttendee.id,
          date: today,
          status: status,
          method: "키패드",
          branch_id: selectedBranchId,
          check_in: status === "등원" ? currentTime : null,
          check_out: status === "하원" ? currentTime : null,
        };
        const { error: insertError } = await supabase
          .from("attendance_logs")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      await sendGlobalPushNotification({
        targetBranchId: null,
        targetUserId: selectedAttendee.parentId || selectedAttendee.id,
        title: `🔔 출결 안내`,
        body: `${selectedAttendee.name} 학생이 안전하게 ${status} 완료하였습니다.`,
        type: "attendance",
        relatedId: validReservation.id,
      });

      Alert.alert("성공", `${selectedAttendee.name} ${status} 처리 완료!`);
      handleClear();
    } catch (error: any) {
      console.error("Attendance logging failed:", error.message);
      Alert.alert("오류", `출결 처리 중 문제가 발생했습니다: ${error.message}`);
    } finally {
      setIsLoggingAttendance(false);
    }
  };

  const renderKeypad = () => (
    <View style={styles.keypadContainer}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <TouchableOpacity
          key={num}
          style={styles.keypadButton}
          onPress={() => handleKeypadPress(String(num))}
        >
          <Text style={styles.keypadButtonText}>{num}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.keypadButton, styles.clearButton]}
        onPress={handleClear}
      >
        <Text style={[styles.keypadButtonText, { color: "#EF4444" }]}>C</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.keypadButton}
        onPress={() => handleKeypadPress("0")}
      >
        <Text style={styles.keypadButtonText}>0</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.keypadButton} onPress={handleBackspace}>
        <Ionicons name="backspace-outline" size={30} color="#475569" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* 상단 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>아이패스케어 출결 키오스크</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flexContainer}
      >
        {/* 기기별 하단 안전영역 바닥 패딩 동적 적용 */}
        <View
          style={[
            styles.mainContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* 1️⃣ 전화번호 입력 디스플레이 구역 */}
          <View style={styles.displaySection}>
            <Text style={styles.sectionTitle}>
              전화번호 뒷 4자리를 눌러주세요
            </Text>
            <TextInput
              style={styles.keypadDisplay}
              value={keypadInput}
              editable={false}
              placeholder="・ ・ ・ ・"
              placeholderTextColor="#CBD5E1"
              maxLength={4}
            />
          </View>

          {/* 2️⃣ [UX 개선] 상단으로 끌어올려진 출결 대상 선택 및 결과 확인 구역 */}
          <View style={styles.resultTopSection}>
            {searchLoading ? (
              <View style={styles.centeredView}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>
                  정보를 확인하고 있어요...
                </Text>
              </View>
            ) : keypadInput.length === 4 ? (
              searchResults.length > 0 ? (
                <View style={styles.resultsWrapper}>
                  <Text style={styles.resultsHeader}>
                    이름이 맞는지 확인해 주세요!
                  </Text>

                  <View style={styles.listContainer}>
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.id + item.type}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.attendeeItem,
                            selectedAttendee?.id === item.id &&
                              selectedAttendee?.type === item.type &&
                              styles.selectedAttendeeItem,
                          ]}
                          onPress={() => setSelectedAttendee(item)}
                        >
                          <View style={styles.attendeeTextGroup}>
                            <Text style={styles.attendeeName}>
                              {item.name}{" "}
                              <Text style={styles.ageText}>
                                ({calculateAge(item.birthDate)}세)
                              </Text>
                            </Text>
                            {!!item.targetClass && (
                              <Text style={styles.attendeeClass}>
                                수업: {item.targetClass}
                              </Text>
                            )}
                          </View>
                          <Ionicons
                            name={
                              selectedAttendee?.id === item.id &&
                              selectedAttendee?.type === item.type
                                ? "checkbox"
                                : "square-outline"
                            }
                            size={28}
                            color={
                              selectedAttendee?.id === item.id &&
                              selectedAttendee?.type === item.type
                                ? "#6366F1"
                                : "#94A3B8"
                            }
                          />
                        </TouchableOpacity>
                      )}
                    />
                  </View>

                  {/* 등원 / 하원 처리 액션 버튼 구역 (중간에 배치되어 하단 바 겹침 원천 방지) */}
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.checkInButton,
                        !selectedAttendee && styles.disabledButton,
                      ]}
                      onPress={() => handleAttendanceAction("등원")}
                      disabled={!selectedAttendee || isLoggingAttendance}
                    >
                      {isLoggingAttendance ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.actionButtonText}>등 원</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.checkOutButton,
                        !selectedAttendee && styles.disabledButton,
                      ]}
                      onPress={() => handleAttendanceAction("하원")}
                      disabled={!selectedAttendee || isLoggingAttendance}
                    >
                      {isLoggingAttendance ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.actionButtonText}>하 원</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.centeredView}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={44}
                    color="#94A3B8"
                  />
                  <Text style={styles.noResultsText}>
                    예약된 수업이 없거나 번호가 틀렸습니다.
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.centeredView}>
                <Ionicons
                  name="finger-print-outline"
                  size={48}
                  color="#E2E8F0"
                />
                <Text style={styles.guideSubText}>
                  출결 패드에 번호를 채워주세요.
                </Text>
              </View>
            )}
          </View>

          {/* 3️⃣ [UX 개선] 하단에 안정감 있게 고정된 키패드 구역 */}
          <View style={styles.keypadBottomSection}>{renderKeypad()}</View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  flexContainer: { flex: 1 },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between", // 컴포넌트들을 위아래 균형감 있게 분산 배치
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: { padding: 5 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },

  displaySection: { marginTop: 16, alignItems: "center" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 10,
  },
  keypadDisplay: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: "100%",
    paddingVertical: 14,
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center",
    color: "#1E293B",
    borderWidth: 2,
    borderColor: "#6366F1",
    letterSpacing: 4,
  },

  /* 🚀 [변경] 상단으로 이동한 결과 및 출결 액션 카드 디자인 스타일 */
  resultTopSection: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  resultsWrapper: { flex: 1, justifyContent: "space-between" },
  resultsHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 10,
    textAlign: "center",
  },
  listContainer: { flex: 1, maxHeight: 120 },

  attendeeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  selectedAttendeeItem: { borderColor: "#6366F1", backgroundColor: "#EEF2FF" },
  attendeeTextGroup: { flex: 1 },
  attendeeName: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  ageText: { fontSize: 14, fontWeight: "500", color: "#64748B" },
  attendeeClass: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "600",
    marginTop: 2,
  },

  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  checkInButton: { backgroundColor: "#22C55E" },
  checkOutButton: { backgroundColor: "#EF4444" },
  disabledButton: { backgroundColor: "#CBD5E1", opacity: 0.6 },
  actionButtonText: { color: "#FFF", fontSize: 18, fontWeight: "900" },

  /* 🚀 [변경] 하단에 안착한 키패드 구역 레이아웃 스타일 */
  keypadBottomSection: {
    marginBottom: 4,
    width: "100%",
  },
  keypadContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  keypadButton: {
    width: "31%",
    aspectRatio: 1.5, // 기종 편차 최소화를 위해 콤팩트한 비율 유지
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
  },
  clearButton: { backgroundColor: "#FEF2F2" },
  keypadButtonText: { fontSize: 26, fontWeight: "800", color: "#1E293B" },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: "#6366F1",
    fontWeight: "600",
  },
  noResultsText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  guideSubText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    fontWeight: "500",
  },
});

export default AdminAttendanceScreen;
