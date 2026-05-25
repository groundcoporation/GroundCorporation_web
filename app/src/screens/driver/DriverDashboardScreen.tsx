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

// 🚀 [좀비 원천 봉쇄] 앱 전체에서 딱 하나씩만 존재하도록 통제하는 글로벌 변수들
let globalLocationSub: Location.LocationSubscription | null = null;
let globalIsDriving = false;
let currentTrackingSessionId: string | null = null; // 💡 좀비 추적기를 감별할 고유 고스트 세션 ID

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

    // 🚀 새로운 추적 세션 번호를 발급합니다.
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
        timeInterval: 1000,
        distanceInterval: 1,
      },
      async (location) => {
        // 🚨 [자폭 프로그래밍] 스위치가 꺼졌거나, 내가 현재 활성화된 최신 추적 세션이 아니라면
        if (!globalIsDriving || currentTrackingSessionId !== mySessionId) {
          try {
            sub.remove(); // 🎯 엉뚱한 녀석을 죽이지 않고, "좀비 자신"을 확실하게 쏴서 파괴합니다!
            console.log(
              "💀 [좀비 퇴치] 오래된 유령 추적기가 스스로 자폭하여 소멸했습니다.",
            );
          } catch (e) {}
          return;
        }

        const { latitude, longitude } = location.coords;

        console.log(
          `📍 [GPS 테스트 중] ${new Date().toLocaleTimeString()} - 위도: ${latitude.toFixed(6)}, 경도: ${longitude.toFixed(6)}`,
        );

        const { error } = await supabase.from("shuttle_status").upsert({
          shuttle_id: profile.id,
          driver_id: profile.id,
          is_driving: true,
          lat: latitude,
          lng: longitude,
          last_update: new Date().toISOString(),
          branch_id: isDeveloper ? branchId : profile.branch_id,
        });

        if (error) console.log("🚨 DB 저장 에러:", error.message);
        else console.log("✅ DB 업데이트 성공");
      },
    );

    globalLocationSub = sub;
  };

  // 🚀 본부장님 말씀대로 꼼수 부리지 않고, 100% 정직하게 DB에 적힌 참/거짓 상태를 그대로 긁어와 동기화합니다!
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

        const { data: statusData, error: statusError } = await supabase
          .from("shuttle_status")
          .select("is_driving")
          .eq("shuttle_id", profile.id)
          .maybeSingle();

        // 데이터가 없거나 에러면 강제로 false 처리, 있으면 DB 값 그대로 사용!
        const drivingNow = statusData ? Boolean(statusData.is_driving) : false;

        globalIsDriving = drivingNow;
        setIsDriving(drivingNow);
        isDrivingRef.current = drivingNow;

        if (drivingNow && !globalLocationSub) {
          console.log(
            "🚐 [운행 복구] 기존 운행 상태를 감지하여 위치 추적을 자동 재개합니다.",
          );
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

  const fetchTodayPickups = async (targetBranchId: string) => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      if (data && data.length > 0) {
        const grouped = data.reduce((acc: any, curr: any) => {
          const spotId = curr.pickup_spots?.id || "unknown";
          const spotName = curr.pickup_spots?.name || "지정되지 않은 정류장";

          if (!acc[spotId]) {
            acc[spotId] = { id: spotId, spotName: spotName, students: [] };
          }

          acc[spotId].students.push({
            child_id: curr.child_id,
            parent_id: curr.children?.parent_id,
            name: curr.children?.child_name || "이름 확인 필요",
            detail: curr.detail_location,
            status: "pending",
          });

          return acc;
        }, {});

        const newGroups = Object.values(grouped);
        if (JSON.stringify(newGroups) !== JSON.stringify(pickupGroups)) {
          setPickupGroups(newGroups);
        }
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
        // 🛑 [종료 절차 엄격화]
        globalIsDriving = false;
        setIsDriving(false);
        currentTrackingSessionId = null; // 모든 구형 세션 무효화

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

        if (error) {
          console.error("DB 업데이트 실패:", error);
        } else {
          console.log("🛑 성공: DB 상태가 false로 고정되었습니다.");
        }

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
    const eventType = nextStatus === "boarded" ? "승차" : "하차";

    const nowKST = dayjs().tz().format("YYYY-MM-DDTHH:mm:ssZ");

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
      await supabase.from("shuttle_logs").insert([
        {
          child_id: student.child_id,
          event_type: eventType,
          event_time: nowKST,
          branch_id: targetBranch,
        },
      ]);

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
    } catch (err) {
      Alert.alert("오류", "기록 저장에 실패했습니다.");
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
                    >
                      <Text style={styles.statusBtnText}>
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
