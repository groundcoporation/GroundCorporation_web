import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as TaskManager from "expo-task-manager";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { sendGlobalPushNotification } from "../../services/notificationService";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ko");

// 🚀 [백그라운드 위치 추적 태스크 정의]
// 이 부분은 반드시 컴포넌트 외부(최상단)에 있어야 합니다.
const LOCATION_TASK_NAME = "SHUTTLE_LOCATION_TRACKING";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("❌ 백그라운드 위치 오류:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      const { latitude, longitude } = location.coords;

      // 백그라운드 태스크는 Hook을 못 쓰므로 AsyncStorage에서 정보를 직접 꺼내야 합니다.
      const driverId = await AsyncStorage.getItem("tracking_driver_id");
      const branchId = await AsyncStorage.getItem("tracking_branch_id");

      if (driverId && branchId) {
        await supabase.from("shuttle_status").upsert({
          shuttle_id: driverId,
          driver_id: driverId,
          is_driving: true,
          lat: latitude,
          lng: longitude,
          last_update: new Date().toISOString(),
          branch_id: branchId,
        });
      }
    }
  }
});

// 🚀 [좀비 원천 봉쇄]
let globalIsDriving = false;
let currentTrackingSessionId: string | null = null;

export default function DriverDashboardScreen({ navigation }: any) {
  const { branchId, role, setBranch } = useAuth();

  const [isDriving, setIsDriving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickupGroups, setPickupGroups] = useState<any[]>([]);
  const [driverInfo, setDriverInfo] = useState<any>(null);

  // 🚀 날짜 선택을 위한 State 추가 (좌우 화살표 연동)
  const [selectedDate, setSelectedDate] = useState(dayjs().tz());

  const isDrivingRef = useRef(false);
  useEffect(() => {
    isDrivingRef.current = isDriving;
  }, [isDriving]);

  const isDeveloper = role === "admin" || driverInfo?.role === "admin";

  // 날짜 이동 함수
  const goToPrevDay = () => setSelectedDate((prev) => prev.subtract(1, "day"));
  const goToNextDay = () => setSelectedDate((prev) => prev.add(1, "day"));

  useEffect(() => {
    if (!driverInfo) return;

    const targetBranch = isDeveloper ? branchId : driverInfo?.branch_id;
    const channel = supabase
      .channel("realtime:pickup_dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pickup_settings",
          filter: targetBranch ? `branch_id=eq.${targetBranch}` : undefined,
        },
        () => {
          if (targetBranch) fetchTodayPickups(targetBranch);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDeveloper, branchId, driverInfo, selectedDate]);

  const startLocationTracking = async (profile: any) => {
    // 1. 포그라운드 권한 요청
    const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      const { status: newFgStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (newFgStatus !== "granted") return;
    }

    // 2. 백그라운드(항상 허용) 권한 요청 (매우 중요!)
    const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();

    if (bgStatus !== "granted") {
      Alert.alert(
        "위치 권한 설정 필요",
        "앱을 닫아도 셔틀 위치를 전송하려면 위치 권한을 반드시 '항상 허용'으로 설정해야 합니다.\n\n설정 화면에서 [권한 -> 위치 -> 항상 허용]을 선택해주세요.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "설정으로 이동",
            onPress: () => Linking.openSettings(),
          },
        ],
      );
      return;
    }

    const mySessionId = Math.random().toString(36).substring(7);
    currentTrackingSessionId = mySessionId;

    // 3. 백그라운드 태스크에서 사용할 데이터 저장
    const targetBranch = isDeveloper ? branchId : profile.branch_id;
    await AsyncStorage.setItem("tracking_driver_id", profile.id);
    await AsyncStorage.setItem("tracking_branch_id", targetBranch);

    // 4. 백그라운드 위치 업데이트 시작
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000, // 10초마다
      distanceInterval: 5, // 5미터 이동시
      deferredUpdatesInterval: 10000,
      // 안드로이드 전용: 상단바 알림을 띄워 서비스 유지
      foregroundService: {
        notificationTitle: "아이패스케어 셔틀 운행 중",
        notificationBody: "실시간 위치를 전송하고 있습니다.",
        notificationColor: "#6366F1",
      },
      pausesUpdatesAutomatically: false,
    });
  };

  const fetchDriverInfoAndPickups = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("id, name, branch_id, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDriverInfo(profile);

        const { data: statusData } = await supabase
          .from("shuttle_status")
          .select("is_driving")
          .eq("shuttle_id", profile.id)
          .maybeSingle();

        const drivingNow = statusData ? Boolean(statusData.is_driving) : false;

        globalIsDriving = drivingNow;
        setIsDriving(drivingNow);
        isDrivingRef.current = drivingNow;

        const isTaskRunning =
          await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (drivingNow && !isTaskRunning) {
          await startLocationTracking(profile);
        }

        const targetBranch =
          profile.role === "admin" || role === "admin"
            ? branchId
            : profile.branch_id;

        if (targetBranch) {
          await fetchTodayPickups(targetBranch);
        }
      }
    } catch (e) {
      console.error("❌ 기사님 정보 로드 실패:", e);
      globalIsDriving = false;
      setIsDriving(false);
      isDrivingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDriverInfoAndPickups();
    }, [selectedDate, branchId]), // 🚀 지점이나 날짜가 변경되면 무조건 새로 불러옵니다.
  );

  // 🚀 [튕김 방지 완벽 수술] Null 값으로 인한 에러를 완벽하게 차단했습니다!
  const fetchTodayPickups = async (targetBranchId: string) => {
    try {
      setLoading(true);
      const targetDateStr = selectedDate.format("YYYY-MM-DD");

      // 1. 해당 지점의 '셔틀을 이용하는 학생' 명단부터 먼저 가져옵니다.
      const { data: settingsData, error: settingsError } = await supabase
        .from("pickup_settings")
        .select(
          `
          detail_location,
          child_id,
          pickup_spots ( id, name ),
          children ( child_name, parent_id )
        `,
        )
        .eq("is_active", true)
        .eq("branch_id", targetBranchId);

      if (settingsError) throw settingsError;

      const shuttleChildIds = settingsData?.map((s: any) => s.child_id) || [];

      // 셔틀 타는 학생이 없으면 종료 (빈 배열로 처리)
      if (shuttleChildIds.length === 0) {
        setPickupGroups([]);
        setLoading(false);
        return;
      }

      // 2. 오늘 날짜에 예약된 정보 + 시간표 정보 가져오기
      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select(
          `
          child_id,
          schedule_id,
          class_schedules (
            id,
            target_class,
            start_time,
            end_time
          )
        `,
        )
        .eq("class_date", targetDateStr)
        .in("child_id", shuttleChildIds);

      if (resError) throw resError;

      // 3. 오늘 출석 기록 가져오기 (버튼 상태 복원용)
      const { data: attData } = await supabase
        .from("attendance_logs")
        .select("child_id, shuttle_ride_time, shuttle_drop_time")
        .eq("branch_id", targetBranchId)
        .eq("date", targetDateStr);

      // 4. 자바스크립트로 시간표별로 학생 묶어주기 (🚀 방탄 코드 적용)
      if (reservations && reservations.length > 0) {
        const grouped = reservations.reduce((acc: any, res: any) => {
          const schedule = Array.isArray(res.class_schedules)
            ? res.class_schedules[0]
            : res.class_schedules;
          if (!schedule) return acc;

          const scheduleId = schedule.id || "unknown";

          if (!acc[scheduleId]) {
            // 🚀 시간 값이 아예 없는 경우(null) 튕기는 것을 막기 위한 안전장치
            const sTime = schedule.start_time || "";
            const eTime = schedule.end_time || "";
            const formattedStart = sTime ? sTime.slice(0, 5) : "시간미정";
            const formattedEnd = eTime ? eTime.slice(0, 5) : "시간미정";

            acc[scheduleId] = {
              id: scheduleId,
              timeLabel: `${formattedStart} ~ ${formattedEnd}`,
              className: schedule.target_class || "클래스명 없음",
              startTime: sTime, // 정렬용
              students: [],
            };
          }

          const setting = settingsData.find(
            (s: any) => s.child_id === res.child_id,
          );

          if (setting) {
            let currentStatus = "pending";
            if (attData) {
              const childAtt = attData.find(
                (log: any) => log.child_id === setting.child_id,
              );
              if (childAtt) {
                if (childAtt.shuttle_drop_time) {
                  currentStatus = "dropped_off";
                } else if (childAtt.shuttle_ride_time) {
                  currentStatus = "boarded";
                }
              }
            }

            const childInfo = Array.isArray(setting.children)
              ? setting.children[0]
              : setting.children;
            const spotInfo = Array.isArray(setting.pickup_spots)
              ? setting.pickup_spots[0]
              : setting.pickup_spots;

            acc[scheduleId].students.push({
              child_id: setting.child_id,
              parent_id: childInfo?.parent_id,
              name: childInfo?.child_name || "이름 확인 필요",
              detail: setting.detail_location || "",
              spotName: spotInfo?.name || "지정되지 않은 정류장",
              status: currentStatus,
            });
          }

          return acc;
        }, {});

        // 🚀 시간표 시작 시간(startTime)을 기준으로 정렬할 때도 안전장치 적용
        const sortedGroups = Object.values(grouped).sort((a: any, b: any) => {
          const timeA = a.startTime || "";
          const timeB = b.startTime || "";
          return timeA.localeCompare(timeB);
        });

        setPickupGroups(sortedGroups);
      } else {
        setPickupGroups([]);
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
      setPickupGroups([]); // 에러 시 빈 배열로 안전하게 처리
    } finally {
      setLoading(false);
    }
  };

  const toggleDrivingStatus = async (nextStatus: boolean) => {
    if (!driverInfo) return;

    try {
      if (nextStatus) {
        globalIsDriving = true;
        setIsDriving(true);

        await supabase.from("shuttle_status").upsert({
          shuttle_id: driverInfo.id,
          driver_id: driverInfo.id,
          is_driving: true,
          branch_id: isDeveloper ? branchId : driverInfo.branch_id,
          last_update: new Date().toISOString(),
        });

        await startLocationTracking(driverInfo);
        Alert.alert("운행 시작", "운행이 시작되었습니다.");
      } else {
        globalIsDriving = false;
        setIsDriving(false);
        currentTrackingSessionId = null;

        // 🚀 태스크가 실행 중인지 확인 후 종료 (에러 방지)
        const isTaskRunning =
          await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isTaskRunning) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
        await AsyncStorage.removeItem("tracking_driver_id");
        await AsyncStorage.removeItem("tracking_branch_id");

        await supabase.from("shuttle_status").upsert({
          shuttle_id: driverInfo.id,
          driver_id: driverInfo.id,
          is_driving: false,
          branch_id: isDeveloper ? branchId : driverInfo.branch_id,
          last_update: new Date().toISOString(),
        });

        Alert.alert("운행 종료", "운행이 종료되었습니다.");
      }
    } catch (e) {
      console.error("오류 발생:", e);
    }
  };

  const handleStudentBoarding = async (
    groupId: string,
    student: any,
    status: string,
  ) => {
    if (!isDriving) {
      Alert.alert("알림", "운행 시작 스위치를 먼저 켜주세요!");
      return;
    }

    if (status === "dropped_off") return;

    const nextStatus = status === "pending" ? "boarded" : "dropped_off";
    // 🚀 eventType은 "승차" 또는 "하차"가 됩니다.
    const eventType = nextStatus === "boarded" ? "승차" : "하차";

    const nowISO = new Date().toISOString();
    const targetDateStr = selectedDate.format("YYYY-MM-DD");

    setPickupGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            students: group.students.map((stu: any) =>
              stu.child_id === student.child_id
                ? { ...stu, status: nextStatus }
                : stu,
            ),
          };
        }
        return group;
      }),
    );

    try {
      const targetBranch = isDeveloper ? branchId : driverInfo.branch_id;

      // 1. 셔틀 로그 기록
      const { error: shuttleError } = await supabase
        .from("shuttle_logs")
        .insert([
          {
            child_id: student.child_id,
            event_type: eventType,
            event_time: nowISO,
            branch_id: targetBranch,
          },
        ]);

      if (shuttleError)
        throw new Error("셔틀 로그 에러: " + shuttleError.message);

      // 2. 출석 기록 업데이트
      const { data: existingAtt } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("child_id", student.child_id)
        .eq("date", targetDateStr)
        .maybeSingle();

      const attPayload: any = {};
      if (nextStatus === "boarded") {
        attPayload.shuttle_ride_time = nowISO;
      } else {
        attPayload.shuttle_drop_time = nowISO;
      }

      if (existingAtt) {
        const { error: updateErr } = await supabase
          .from("attendance_logs")
          .update(attPayload)
          .eq("id", existingAtt.id);
        if (updateErr)
          throw new Error("출석 업데이트 에러: " + updateErr.message);
      } else {
        attPayload.child_id = student.child_id;
        attPayload.date = targetDateStr;
        attPayload.branch_id = targetBranch;

        const { error: insertErr } = await supabase
          .from("attendance_logs")
          .insert([attPayload]);
        if (insertErr) throw new Error("출석 생성 에러: " + insertErr.message);
      }

      // =================================================================
      // 🚀 [핵심 해결책!!!] reservations 테이블의 attendance_status도 직접 바꿔줍니다!
      // =================================================================
      const { error: resUpdateErr } = await supabase
        .from("reservations")
        .update({ attendance_status: eventType }) // "승차" 또는 "하차"로 변경
        .eq("child_id", student.child_id)
        .eq("schedule_id", groupId) // groupId가 현재 시간표 id입니다.
        .eq("class_date", targetDateStr);

      if (resUpdateErr)
        throw new Error("예약 상태 변경 에러: " + resUpdateErr.message);
      // =================================================================

      // 학부모 푸시 알림 발송
      if (student.parent_id) {
        await sendGlobalPushNotification({
          targetBranchId: null,
          targetUserId: student.parent_id,
          title: `🚐 셔틀버스 운행 안내`,
          body: `${student.name} 학생이 셔틀버스에 [${eventType} 완료] 하였습니다.`,
          type: "attendance",
          relatedId: student.child_id,
        });
      }
    } catch (err: any) {
      console.error("DB 저장 전체 에러:", err);
      Alert.alert("저장 실패", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>기사님 대시보드</Text>
        </View>

        {isDeveloper ? (
          <TouchableOpacity
            style={styles.branchSwitcher}
            onPress={() =>
              setBranch(branchId === "branch_1" ? "branch_2" : "branch_1")
            }
          >
            <Text style={styles.branchSwitcherText}>
              {branchId === "branch_1" ? "시흥본점" : "영종도점"} 셔틀
            </Text>
            <Ionicons
              name="swap-horizontal"
              size={16}
              color="#FFF"
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.branchStatic}>
            <Text style={styles.branchStaticText}>
              {driverInfo?.branch_id === "branch_1"
                ? "시흥본점"
                : driverInfo?.branch_id === "branch_2"
                  ? "영종도점"
                  : "내 지점"}{" "}
              셔틀
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.statusInfo}>
          <View
            style={[
              styles.statusIndicator,
              isDriving ? styles.activeIndicator : styles.inactiveIndicator,
            ]}
          />
          <Text style={styles.statusText}>
            {isDriving ? "운행 중 (위치 전송중)" : "운행 대기"}
          </Text>
        </View>
        <Switch value={isDriving} onValueChange={toggleDrivingStatus} />
      </View>

      {/* 🚀 날짜 선택기 UI 추가 */}
      <View style={styles.datePickerContainer}>
        <TouchableOpacity onPress={goToPrevDay} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {selectedDate.format("YYYY.MM.DD (dd)")}
        </Text>
        <TouchableOpacity onPress={goToNextDay} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1E293B"
            style={{ marginTop: 50 }}
          />
        ) : pickupGroups.length > 0 ? (
          pickupGroups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                {/* 🚀 장소 대신 시간표 이름으로 변경 */}
                <Text style={styles.spotNameText}>
                  ⏰ {group.timeLabel} ({group.className})
                </Text>
              </View>
              <View style={styles.studentList}>
                {group.students.length > 0 ? (
                  group.students.map((student: any) => (
                    <View key={student.child_id} style={styles.studentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.spotDetailText}>
                          📍 {student.spotName} ({student.detail})
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.statusBtn,
                          student.status === "boarded"
                            ? styles.boardedBtn
                            : student.status === "dropped_off"
                              ? styles.droppedBtn
                              : styles.pendingBtn,
                        ]}
                        onPress={() =>
                          handleStudentBoarding(
                            group.id,
                            student,
                            student.status,
                          )
                        }
                        // 🛑 여기서 하차 완료면 버튼 자체를 먹통으로 만듦!
                        disabled={student.status === "dropped_off"}
                      >
                        <Text
                          style={[
                            styles.statusBtnText,
                            student.status === "dropped_off" && {
                              color: "#FFF",
                            },
                          ]}
                        >
                          {student.status === "pending"
                            ? "승차 처리"
                            : student.status === "boarded"
                              ? "하차 처리"
                              : "하차 완료"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyClassText}>
                    해당 시간에 탑승 예정인 학생이 없습니다.
                  </Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="bus-outline" size={60} color="#CBD5E1" />
            <Text
              style={{
                color: "#64748B",
                fontSize: 16,
                fontWeight: "700",
                marginTop: 16,
                textAlign: "center",
              }}
            >
              선택하신 날짜({selectedDate.format("MM/DD")})에는{"\n"}
              배정된 수업이나 셔틀 탑승 학생이 없습니다.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#1E293B",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 15,
  },
  branchSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  branchSwitcherText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
  branchStatic: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  branchStaticText: { fontSize: 13, fontWeight: "700", color: "#E2E8F0" },
  controlPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  statusInfo: { flexDirection: "row", alignItems: "center" },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  activeIndicator: { backgroundColor: "#10B981" },
  inactiveIndicator: { backgroundColor: "#94A3B8" },
  statusText: { fontSize: 16, fontWeight: "700", color: "#1E293B" },

  // 🚀 날짜 선택기 스타일 추가
  datePickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  dateArrow: { padding: 4 },
  dateText: { fontSize: 16, fontWeight: "800", color: "#1E293B" },

  scrollContent: { padding: 16 },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 1,
  },
  groupHeader: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  spotNameText: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  studentList: { padding: 16 },
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  studentName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  // 🚀 장소 상세 텍스트 스타일 추가
  spotDetailText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
  },
  emptyClassText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 10,
    fontWeight: "600",
  },

  statusBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
  },
  pendingBtn: { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" },
  boardedBtn: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  droppedBtn: { backgroundColor: "#10B981", borderColor: "#10B981" },
  statusBtnText: { fontSize: 14, fontWeight: "700", color: "#475569" },
});
