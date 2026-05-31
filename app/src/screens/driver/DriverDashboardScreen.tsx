import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Switch,
} from "react-native";
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

// 🚀 [좀비 원천 봉쇄]
let globalLocationSub: Location.LocationSubscription | null = null;
let globalIsDriving = false;
let currentTrackingSessionId: string | null = null;

export default function DriverDashboardScreen({ navigation }: any) {
  const { branchId, role, setBranch } = useAuth();

  const [isDriving, setIsDriving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickupGroups, setPickupGroups] = useState<any[]>([]);

  const [driverInfo, setDriverInfo] = useState<any>(null);

  const isDrivingRef = useRef(false);
  useEffect(() => {
    isDrivingRef.current = isDriving;
  }, [isDriving]);

  const isDeveloper = role === "admin" || driverInfo?.role === "admin";

  useEffect(() => {
    if (isDeveloper && driverInfo && branchId) {
      fetchTodayPickups(branchId);
    }
  }, [branchId]);

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
  }, [isDeveloper, branchId, driverInfo]);

  const startLocationTracking = async (profile: any) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const mySessionId = Math.random().toString(36).substring(7);
    currentTrackingSessionId = mySessionId;

    if (globalLocationSub) {
      try {
        globalLocationSub.remove();
      } catch (e) {}
      globalLocationSub = null;
    }

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 1,
      },
      async (location) => {
        if (!globalIsDriving || currentTrackingSessionId !== mySessionId) {
          try {
            sub.remove();
          } catch (e) {}
          return;
        }

        const { latitude, longitude } = location.coords;

        const { error } = await supabase.from("shuttle_status").upsert({
          shuttle_id: profile.id,
          driver_id: profile.id,
          is_driving: true,
          lat: latitude,
          lng: longitude,
          last_update: new Date().toISOString(),
          branch_id: isDeveloper ? branchId : profile.branch_id,
        });
      },
    );

    globalLocationSub = sub;
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

        if (drivingNow && !globalLocationSub) {
          await startLocationTracking(profile);
        }

        const targetBranch =
          profile.role === "admin" || role === "admin"
            ? branchId
            : profile.branch_id;

        if (targetBranch) {
          fetchTodayPickups(targetBranch);
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
    }, []),
  );

  // 🚀 [완벽 수술 1] 고장난 shuttle_logs 대신, attendance_logs를 보고 상태를 완벽 복원합니다!
  const fetchTodayPickups = async (targetBranchId: string) => {
    try {
      const todayDateStr = dayjs().tz().format("YYYY-MM-DD");

      // 1. 오늘 셔틀 탈 아이들 명단 가져오기
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

      // 2. 오늘 출석 기록 가져오기 (버튼 상태 복원용)
      const { data: attData } = await supabase
        .from("attendance_logs")
        .select("child_id, shuttle_ride_time, shuttle_drop_time")
        .eq("branch_id", targetBranchId)
        .eq("date", todayDateStr);

      if (settingsData && settingsData.length > 0) {
        const grouped = settingsData.reduce((acc: any, curr: any) => {
          const spotId = curr.pickup_spots?.id || "unknown";
          const spotName = curr.pickup_spots?.name || "지정되지 않은 정류장";

          if (!acc[spotId]) {
            acc[spotId] = { id: spotId, spotName: spotName, students: [] };
          }

          // 💡 버튼 상태 복원 로직
          let currentStatus = "pending";
          if (attData) {
            const childAtt = attData.find((log: any) => log.child_id === curr.child_id);
            if (childAtt) {
              if (childAtt.shuttle_drop_time) {
                currentStatus = "dropped_off"; // 하차 완료
              } else if (childAtt.shuttle_ride_time) {
                currentStatus = "boarded";     // 승차 완료
              }
            }
          }

          acc[spotId].students.push({
            child_id: curr.child_id,
            parent_id: curr.children?.parent_id,
            name: curr.children?.child_name || "이름 확인 필요",
            detail: curr.detail_location,
            status: currentStatus, // 복원된 상태 적용
          });

          return acc;
        }, {});

        const newGroups = Object.values(grouped);
        setPickupGroups(newGroups);
      } else {
        setPickupGroups([]);
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
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

        if (globalLocationSub) {
          try {
            globalLocationSub.remove();
          } catch (e) {}
          globalLocationSub = null;
        }

        const { error } = await supabase.from("shuttle_status").upsert({
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

  // 🚀 [완벽 수술 2] 버튼 누를 때 에러 없이 완벽하게 저장하는 로직
  const handleStudentBoarding = async (
    groupId: string,
    student: any,
    status: string,
  ) => {
    if (!isDriving) {
      Alert.alert("알림", "운행 시작 스위치를 먼저 켜주세요!");
      return;
    }

    // 🛑 이미 하차까지 한 아이는 클릭 원천 봉쇄
    if (status === "dropped_off") return;

    const nextStatus = status === "pending" ? "boarded" : "dropped_off";
    const eventType = nextStatus === "boarded" ? "승차" : "하차";

    const nowISO = new Date().toISOString(); 
    const todayDateStr = dayjs().tz().format("YYYY-MM-DD");

    // UI 즉시 변경 (빠른 반응)
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
      
      // 🚀 1. 셔틀 로그 기록 (branch_id 포함)
      // ⚠️ 주의: 이 코드가 작동하려면 Supabase의 shuttle_logs 테이블에 반드시 'branch_id' 컬럼(text)이 있어야 합니다!
      const { error: shuttleError } = await supabase.from("shuttle_logs").insert([
        {
          child_id: student.child_id,
          event_type: eventType,
          event_time: nowISO,
          branch_id: targetBranch, 
        },
      ]);

      if (shuttleError) throw new Error("셔틀 로그 에러: " + shuttleError.message);

      // 🚀 2. 출석 현황판(attendance_logs) 안전 업데이트
      const { data: existingAtt } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("child_id", student.child_id)
        .eq("date", todayDateStr)
        .maybeSingle();

      const attPayload: any = {};
      if (nextStatus === "boarded") {
        attPayload.shuttle_ride_time = nowISO;
      } else {
        attPayload.shuttle_drop_time = nowISO;
      }

      if (existingAtt) {
        // 기존 줄이 있으면 Update
        const { error: updateErr } = await supabase
          .from("attendance_logs")
          .update(attPayload)
          .eq("id", existingAtt.id);
        if (updateErr) throw new Error("출석 업데이트 에러: " + updateErr.message);
      } else {
        // 기존 줄이 없으면 Insert
        attPayload.child_id = student.child_id;
        attPayload.date = todayDateStr;
        attPayload.branch_id = targetBranch;
        
        const { error: insertErr } = await supabase
          .from("attendance_logs")
          .insert([attPayload]);
        if (insertErr) throw new Error("출석 생성 에러: " + insertErr.message);
      }

      // 학부모 푸시 알림
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
      // 만약 실패하면 UI를 롤백하는 로직을 추가할 수도 있지만, 일단 알림창으로 인지시킵니다.
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
                <Text style={styles.spotNameText}>📍 {group.spotName}</Text>
              </View>
              <View style={styles.studentList}>
                {group.students.map((student: any) => (
                  <View key={student.child_id} style={styles.studentRow}>
                    <Text style={styles.studentName}>{student.name}</Text>
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
                        handleStudentBoarding(group.id, student, student.status)
                      }
                      // 🛑 여기서 하차 완료면 버튼 자체를 먹통으로 만듦!
                      disabled={student.status === "dropped_off"} 
                    >
                      <Text style={[
                          styles.statusBtnText, 
                          student.status === "dropped_off" && {color: "#FFF"}
                      ]}>
                        {student.status === "pending"
                          ? "승차 처리"
                          : student.status === "boarded"
                            ? "하차 처리"
                            : "하차 완료"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
              현재{" "}
              {isDeveloper
                ? branchId === "branch_1"
                  ? "시흥본점"
                  : "영종도점"
                : "해당 지점"}
              에 배정된{"\n"}오늘의 셔틀 탑승 학생이 없습니다.
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
  },
  spotNameText: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  studentList: { padding: 16 },
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  studentName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
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