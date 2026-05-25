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
import { supabase } from "../../lib/supabase"; // 👈 팀장님 프로젝트의 supabase 설정 경로
import { sendGlobalPushNotification } from "../../services/notificationService";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as Location from "expo-location"; // 🚀 [추가] 실시간 위치 추적 라이브러리
import { useAuth } from "../../context/AuthContext"; // 🚀 [추가] 전역 상태에서 권한 및 지점 가져오기

dayjs.extend(utc);
dayjs.extend(timezone);

export default function DriverDashboardScreen({ navigation }: any) {
  // 🚀 [추가] 권한 및 전역 지점 관리
  const { branchId, role, setBranch } = useAuth();

  const [isDriving, setIsDriving] = useState(false); // 기사님 운행 여부
  const [loading, setLoading] = useState(true);
  const [pickupGroups, setPickupGroups] = useState<any[]>([]);

  // 🚀 [추가] 기사님 정보 및 위치 구독 객체 상태 관리
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [locationSubscription, setLocationSubscription] =
    useState<Location.LocationSubscription | null>(null);

  // 🚀 [안전장치] 위치 전송 즉시 차단용 Ref
  const isDrivingRef = useRef(false);
  useEffect(() => {
    isDrivingRef.current = isDriving;
  }, [isDriving]);

  // 관리자 여부 확인
  const isDeveloper = role === "admin" || driverInfo?.role === "admin";

  // 🚀 [수정] 관리자가 지점을 스왑할 때마다 명단 새로고침 (branchId가 null이 아닐 때만 실행되도록 TS 에러 방지)
  useEffect(() => {
    if (isDeveloper && driverInfo && branchId) {
      fetchTodayPickups(branchId);
    }
  }, [branchId]);

  // 🚀 [핵심] 구독 로직: driverInfo가 로드된 후 딱 한 번만 설정되도록 의존성 최적화
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

  // 🚀 [추가] 위치 전송을 시작하는 독립 함수 (화면 재진입 시 자동 복구용)
  const startLocationTracking = async (profile: any) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    // 🚀 테스트를 위해 1초(1000ms)로 설정
    //추후 distanceInterval: 10 으로 변경예정( 거리가 10미터 이상 이동했을 때만 업데이트 )
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      async (location) => {
        // 🚀 [안전장치] 운행 중이 아니면 즉시 리턴
        if (!isDrivingRef.current) return;

        const { latitude, longitude } = location.coords;

        // 💡 [테스트용 로그] 1초마다 찍히는지 확인
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
    return subscription;
  };

  // 🚀 [수정] 로그인한 기사님의 지점 정보 및 기존 운행 상태 확인 (profile null 체크 추가)
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
        // 💡 [TS 해결] profile이 확실히 존재할 때만 아래 로직 실행
        setDriverInfo(profile);

        // 💡 [핵심] DB에서 현재 운행 상태를 조회하여 상태 복구
        const { data: statusData, error: statusError } = await supabase
          .from("shuttle_status")
          .select("is_driving")
          .eq("shuttle_id", profile.id)
          .maybeSingle();

        const drivingNow = !!statusData?.is_driving;
        setIsDriving(drivingNow);
        isDrivingRef.current = drivingNow;

        // 운행 중이라면 위치 추적 자동 재개
        if (drivingNow) {
          console.log(
            "🚐 [운행 복구] 기존 운행 상태를 감지하여 위치 추적을 자동 재개합니다.",
          );
          const sub = await startLocationTracking(profile);
          if (sub) setLocationSubscription(sub);
        }

        // 타겟 지점: 어드민이면 Context의 전역 지점, 기사면 본인 소속 지점
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
        .eq("branch_id", targetBranchId); // 💡 지점 필터링

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
        // 🚀 [핵심] JSON으로 변환하여 값이 진짜 바뀐 경우에만 상태 업데이트
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

  // 🚀 [수정] 운행 상태 토글 스위치 핸들러: 종료 시 확실한 false 처리
  const toggleDrivingStatus = async (nextStatus: boolean) => {
    if (!driverInfo) return;

    try {
      if (nextStatus) {
        // 🟢 운행 시작
        setIsDriving(true);
        isDrivingRef.current = true;

        await supabase.from("shuttle_status").upsert({
          shuttle_id: driverInfo.id,
          is_driving: true,
          updated_at: new Date().toISOString(),
        });

        const sub = await startLocationTracking(driverInfo);
        if (sub) setLocationSubscription(sub);
        Alert.alert("운행 시작", "운행이 시작되었습니다.");
      } else {
        // 🛑 [강력한 종료]
        setIsDriving(false);
        isDrivingRef.current = false; // GPS 추적기 차단

        // 1. 모든 구독 객체를 찾아서 강제로 remove
        if (locationSubscription) {
          locationSubscription.remove();
          setLocationSubscription(null);
        }

        // 2. DB를 FALSE로 강제 업데이트
        const { error } = await supabase
          .from("shuttle_status")
          .update({ is_driving: false, updated_at: new Date().toISOString() })
          .eq("shuttle_id", driverInfo.id);

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
