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
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";
import { useAuth } from "../../context/AuthContext"; // Import useAuth to get branchId
import { sendGlobalPushNotification } from "../../services/notificationService"; // 🚀 푸시 알림 서비스 추가

interface AttendeeInfo {
  id: string; // child_id or user_id
  name: string; // child_name or user_name
  birthDate: string; // child_birth or user_birth_date (YYYYMMDD format)
  type: "child" | "parent";
  parentId?: string; // parent_id if type is child
  parentName?: string; // parent_name if type is child
  targetClass?: string; // Add targetClass to display
}

const AdminAttendanceScreen: React.FC<any> = ({ navigation }) => {
  const { branchId: selectedBranchId } = useAuth(); // Get branchId from AuthContext

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

  // Helper function to check for valid reservations for an attendee
  const checkValidReservationForAttendee = useCallback(
    async (attendee: AttendeeInfo): Promise<boolean> => {
      const today = dayjs().tz().format("YYYY-MM-DD");
      const now = dayjs().tz();

      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select("*, class_schedules(start_time, end_time)")
        .eq(attendee.type === "child" ? "child_id" : "user_id", attendee.id)
        .eq("class_date", today)
        .neq("status", "canceled"); // Only consider non-canceled reservations

      if (resError) {
        console.error("Error checking reservation for attendee:", resError);
        return false;
      }

      const validReservation = reservations?.find((res: any) => {
        const sched = res.class_schedules;
        if (!sched) return false;

        const startTime = dayjs(`${today} ${sched.start_time}`);
        const endTime = dayjs(`${today} ${sched.end_time}`);

        // Check if current time is within 10 minutes before start or 10 minutes after end
        return (
          now.isAfter(startTime.subtract(10, "minute")) &&
          now.isBefore(endTime.add(10, "minute"))
        );
      });

      return !!validReservation;
    },
    [],
  ); // Dependencies: none, as supabase and dayjs are stable, and attendee is passed as argument.

  const searchAttendees = useCallback(
    async (last4Digits: string) => {
      setSearchLoading(true);
      setSearchResults([]);
      setSelectedAttendee(null);

      try {
        const potentialResults: AttendeeInfo[] = [];

        // 1. 'users' 테이블에서 전화번호 뒷 4자리가 일치하는 사용자 검색 (부모님)
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, phone, birth_date, target_class")
          .eq("branch_id", selectedBranchId)
          .ilike("phone", `%${last4Digits}`);

        if (usersError) throw usersError;

        if (usersData && usersData.length > 0) {
          for (const user of usersData) {
            // 해당 부모의 자녀 정보도 함께 검색
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
              // 자녀가 없는 부모는 본인으로 간주 (성인반 등)
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

        // Filter potential results based on valid reservations
        const filteredResults: AttendeeInfo[] = [];
        for (const attendee of potentialResults) {
          const hasValidReservation =
            await checkValidReservationForAttendee(attendee);
          if (hasValidReservation) {
            filteredResults.push(attendee);
          }
        }

        // Remove duplicates (same id + type combination) from filtered results
        const uniqueResults = Array.from(
          new Map(
            filteredResults.map((item) => [item.id + item.type, item]),
          ).values(),
        );
        setSearchResults(uniqueResults);

        // 🚀 [추가] 검색 결과가 하나일 경우 자동으로 선택
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
  ); // Dependencies for useCallback

  useEffect(() => {
    if (keypadInput.length === 4) {
      searchAttendees(keypadInput);
    } else {
      setSearchResults([]);
      setSelectedAttendee(null);
    }
  }, [keypadInput, selectedBranchId, searchAttendees]); // Add searchAttendees to dependencies

  const calculateAge = (birthDate: string | null | undefined) => {
    if (!birthDate || birthDate.length !== 8) return 0;
    try {
      const year = parseInt(birthDate.substring(0, 4), 10); // Specify radix
      const currentYear = dayjs().tz().year(); // 한국 시간 기준 현재 연도
      return currentYear - year + 1; // 한국 나이
    } catch (e) {
      return 0;
    }
  }; // Missing closing brace added here

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

      // =========================================================================
      // 🚀 [핵심] 현재 시간대 예약 확인 로직 (10분 버퍼 적용)
      // =========================================================================
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

      // 현재 시간과 대조하여 유효한 예약 찾기
      const validReservation = reservations?.find((res: any) => {
        const sched = res.class_schedules;
        if (!sched) return false;

        // 시작 시간 10분 전 ~ 종료 시간 10분 후까지 허용
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
      // =========================================================================

      // 1. 예약 테이블 상태 업데이트 (학부모 앱 연동)
      await supabase
        .from("reservations")
        .update({ attendance_status: status })
        .eq("id", validReservation.id);

      // Check for existing attendance log for today
      const { data: existingLog, error: fetchError } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("child_id", selectedAttendee.id)
        .eq("date", today)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 means no rows found
        throw fetchError;
      }

      if (existingLog) {
        // Update existing log
        const updateData: {
          check_in?: string;
          check_out?: string;
          status?: string;
        } = {};
        if (status === "등원") {
          updateData.check_in = currentTime;
          updateData.status = "등원";
        } else {
          // status === "하원"
          updateData.check_out = currentTime;
          updateData.status = "하원"; // Or a more complex status logic
        }

        const { error: updateError } = await supabase
          .from("attendance_logs")
          .update(updateData)
          .eq("id", existingLog.id);

        if (updateError) throw updateError;
      } else {
        // Insert new log
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

      // 🚀 [추가] 학부모에게 실시간 푸시 발송
      await sendGlobalPushNotification({
        targetBranchId: null,
        targetUserId: selectedAttendee.parentId || selectedAttendee.id,
        title: `🔔 출결 안내`,
        body: `${selectedAttendee.name} 학생이 안전하게 ${status} 완료하였습니다.`,
        type: "attendance",
        relatedId: validReservation.id,
      });

      Alert.alert("성공", `${selectedAttendee.name} ${status} 처리 완료!`);
      handleClear(); // Clear input and selection after successful logging
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
      <TouchableOpacity style={styles.keypadButton} onPress={handleClear}>
        <Text style={styles.keypadButtonText}>C</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.keypadButton}
        onPress={() => handleKeypadPress("0")}
      >
        <Text style={styles.keypadButtonText}>0</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.keypadButton} onPress={handleBackspace}>
        <Ionicons name="backspace-outline" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>키패드 출결 관리</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>전화번호 뒷 4자리 입력</Text>
          <TextInput
            style={styles.keypadDisplay}
            value={keypadInput}
            editable={false}
            placeholder="****"
            placeholderTextColor="#999"
            maxLength={4}
          />
          {renderKeypad()}
          {searchLoading ? (
            <ActivityIndicator
              size="large"
              color="#6366F1"
              style={{ marginTop: 20 }}
            />
          ) : keypadInput.length === 4 ? (
            searchResults.length > 0 ? (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsHeader}>출결 대상 선택:</Text>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id + item.type}
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
                      <View>
                        <Text style={styles.attendeeName}>
                          {item.name} ({calculateAge(item.birthDate)}세)
                          {item.type === "child" &&
                            item.parentName &&
                            ` (학부모: ${item.parentName})`}
                        </Text>
                        {!!item.targetClass && (
                          <Text style={styles.attendeeClass}>
                            수업반: {item.targetClass}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={
                          selectedAttendee?.id === item.id &&
                          selectedAttendee?.type === item.type
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={20}
                        color={
                          selectedAttendee?.id === item.id &&
                          selectedAttendee?.type === item.type
                            ? "#6366F1"
                            : "#999"
                        }
                      />
                    </TouchableOpacity>
                  )}
                />
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.checkInButton]}
                    onPress={() => handleAttendanceAction("등원")}
                    disabled={!selectedAttendee || isLoggingAttendance}
                  >
                    {isLoggingAttendance ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>등원 처리</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.checkOutButton]}
                    onPress={() => handleAttendanceAction("하원")}
                    disabled={!selectedAttendee || isLoggingAttendance}
                  >
                    {isLoggingAttendance ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>하원 처리</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.noResultsText}>
                일치하는 사용자를 찾을 수 없습니다.
              </Text>
            )
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Ensure content is not cut off by keyboard
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  keypadDisplay: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 30,
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  keypadButton: {
    width: "30%", // Roughly 3 buttons per row
    aspectRatio: 1.2, // Make buttons slightly rectangular
    justifyContent: "center",
    alignItems: "center",
    margin: "1.5%",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  keypadButtonText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  resultsContainer: {
    marginTop: 20,
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  attendeeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedAttendeeItem: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  attendeeName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  attendeeClass: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
  },
  checkInButton: {
    backgroundColor: "#22C55E", // Green for check-in
  },
  checkOutButton: {
    backgroundColor: "#EF4444", // Red for check-out
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  noResultsText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#999",
  },
});

export default AdminAttendanceScreen;
