import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../../lib/supabase";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";

// =========================================================================
// 🚀 [GPS 추적 주기 수정 메뉴얼]
// 본부장님, GPS 위치를 언제 한 번씩 보낼지(10초, 5미터 등) 수정하시려면
// 이 파일이 아니라 기사님 화면인 "DriverDashboardScreen.tsx" 파일을 여셔야 합니다!
//
// [수정 위치] DriverDashboardScreen.tsx 의 startLocationTracking 함수 내부:
// await Location.watchPositionAsync(
//   {
//     accuracy: Location.Accuracy.High,
//     timeInterval: 10000,     // 💡 시간 기준: 10000 = 10초마다 위치 전송 시도
//     distanceInterval: 5      // 💡 거리 기준: 5 = 5미터 이상 이동하면 즉시 위치 전송
//   }, ...
//
// ※ 참고: 10초로 맞춰두어도, 차량이 신호대기 등으로 아예 움직임이 없으면 스마트폰 자체
// 배터리 절약 모드 때문에 10초가 지나도 위치를 쏘지 않을 수 있습니다 (정상적인 OS 작동 방식입니다).
// =========================================================================

const RealtimeMapScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { branchId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shuttle, setShuttle] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  // =========================================================================
  // 1. [초기 데이터 로딩] 화면을 처음 켰을 때 현재 운행 중인 셔틀버스를 찾아옵니다.
  // =========================================================================
  const fetchShuttleStatus = async () => {
    if (!branchId) {
      setShuttle(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shuttle_status")
        .select("*")
        .eq("is_driving", true)
        .eq("branch_id", branchId)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setShuttle(data);
      } else {
        setShuttle(null);
      }
    } catch (e) {
      setShuttle(null);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 2. [실시간 구독 & 권한 설정] 위치 권한을 묻고, Supabase 실시간 데이터를 구독합니다.
  // =========================================================================
  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    const requestPermission = async () => {
      await Location.requestForegroundPermissionsAsync();
    };
    requestPermission();

    fetchShuttleStatus();

    const subscription = supabase
      .channel(`shuttle_move:${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shuttle_status",
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          console.log(
            "📡 [관제 수신] 데이터 수신 성공:",
            payload.new.lat,
            payload.new.lng,
          );

          if (payload.new && payload.new.is_driving) {
            setShuttle({ ...payload.new });

            // 💡 상단 헤더에 마커가 짤리지 않도록 카메라 중심(위도)을 살짝 아래로 보정합니다.
            mapRef.current?.animateToRegion(
              {
                latitude: Number(payload.new.lat) + 0.0004,
                longitude: Number(payload.new.lng),
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
              },
              1000,
            );
          } else {
            setShuttle(null);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [branchId]);

  // =========================================================================
  // 3. [화면 렌더링 (UI)] 실제 스마트폰에 보여지는 화면 구성입니다.
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      {/* --- 상단 헤더 --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>실시간 셔틀 위치</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* --- 구글 지도 영역 --- */}
      <View style={styles.mapArea}>
        {shuttle?.lat && shuttle?.lng ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: Number(shuttle.lat) + 0.0004, // 진입 시에도 상단 헤더 짤림 방지 보정
              longitude: Number(shuttle.lng),
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            mapPadding={{ top: 80, right: 0, bottom: 200, left: 0 }}
          >
            {/* 🚀 [버스 마커] 셔틀버스의 현재 위치를 나타내는 아이콘입니다. */}
            <Marker
              key={`${shuttle.shuttle_id}-${shuttle.lat}-${shuttle.lng}`}
              coordinate={{
                latitude: Number(shuttle.lat),
                longitude: Number(shuttle.lng),
              }}
              title="셔틀버스"
              tracksViewChanges={true}
            >
              {/* 🚀 [수정] 촌스러운 동그라미 테두리를 없애고 깔끔하게 버스 아이콘만 크게 띄웁니다! */}
              <Ionicons
                name="bus"
                size={40}
                color="#6366F1"
                style={{
                  textShadowColor: "rgba(0, 0, 0, 0.4)", // 지도 위에서 잘 보이도록 살짝 그림자만 추가
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                }}
              />
            </Marker>
          </MapView>
        ) : (
          // 운행 중인 버스가 없을 때 보여주는 빈 화면
          <View style={styles.emptyMap}>
            <Ionicons name="map-outline" size={64} color="#CBD5E1" />
            <Text style={styles.mapText}>현재 운행 중인 셔틀이 없습니다.</Text>
          </View>
        )}
      </View>

      {/* --- 하단 기사님 정보 카드 --- */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : shuttle ? (
        <View
          style={[styles.driverCard, { bottom: Math.max(insets.bottom, 20) }]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.driverProfile}>
              <View style={styles.avatar}>
                <Ionicons name="bus" size={24} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.driverName}>현재 운행 중인 셔틀</Text>
                <Text style={styles.carNumber}>
                  ID:{" "}
                  {shuttle.shuttle_id
                    ? shuttle.shuttle_id.substring(0, 8)
                    : "확인중"}
                  ...
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() =>
                Alert.alert("알림", "연락처가 등록되지 않았습니다.")
              }
            >
              <Feather name="phone-call" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <View style={styles.liveIndicator}>
              <View style={styles.redDot} />
              <Text style={styles.liveText}>실시간</Text>
            </View>
            <Text style={styles.statusMsg}>
              위치가 실시간 업데이트 중입니다.
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

// =========================================================================
// 4. [스타일 설정] 색상, 크기, 여백 등을 지정합니다.
// =========================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  mapArea: { flex: 1, backgroundColor: "#E2E8F0" },
  emptyMap: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapText: { fontSize: 16, color: "#94A3B8", marginTop: 10, fontWeight: "600" },
  loadingBox: { position: "absolute", bottom: 50, alignSelf: "center" },
  // 하단 정보 카드 디자인
  driverCard: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverProfile: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  carNumber: { fontSize: 13, color: "#64748B", marginTop: 2 },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 15 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    marginRight: 5,
  },
  liveText: { fontSize: 11, fontWeight: "800", color: "#EF4444" },
  statusMsg: { fontSize: 14, color: "#475569", fontWeight: "600" },
});

export default RealtimeMapScreen;
