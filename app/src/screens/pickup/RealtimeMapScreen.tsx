import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps'; 
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location'; // 🚀 [추가] 내 위치 권한을 얻기 위해 추가

const RealtimeMapScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [shuttle, setShuttle] = useState<any>(null);
  const mapRef = useRef<MapView>(null); 

  // =========================================================================
  // 1. [초기 데이터 로딩] 화면을 처음 켰을 때 현재 운행 중인 셔틀버스를 찾아옵니다.
  // =========================================================================
  const fetchShuttleStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shuttle_status')
        .select('*')
        .eq('is_driving', true) // 운행 중(true)인 셔틀만 찾습니다.
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
    // 💡 내 위치(파란 점)를 띄우려면 지도를 보는 사람도 위치 권한이 필요합니다.
    const requestPermission = async () => {
      await Location.requestForegroundPermissionsAsync();
    };
    requestPermission();

    // 초기 데이터 불러오기
    fetchShuttleStatus();

    // 💡 Supabase Realtime 설정: 기사님이 위치를 쏠 때마다 즉시 감지하여 지도를 움직입니다.
    const subscription = supabase
      .channel('shuttle_move')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'shuttle_status' 
      }, payload => {
        console.log("📡 [관제 수신] 데이터 수신 성공:", payload.new.lat, payload.new.lng);

        if (payload.new && payload.new.is_driving) {
          setShuttle({ ...payload.new }); // 🚀 새로운 객체로 주입하여 지도가 마커를 강제로 다시 그리게 만듭니다.
          // 💡 버스가 움직이면 지도 카메라도 버스를 따라 부드럽게 이동(animate)합니다.
          mapRef.current?.animateToRegion({
            latitude: Number(payload.new.lat),
            longitude: Number(payload.new.lng),
            latitudeDelta: 0.002, // 숫자가 작을수록 지도가 확대됩니다.
            longitudeDelta: 0.002,
          }, 1000); // 1초(1000ms) 동안 부드럽게 이동
        } else {
          setShuttle(null); // 운행이 종료되면 버스를 화면에서 지웁니다.
        }
      })
      .subscribe();

    // 화면을 나갈 때 실시간 구독을 끊어줍니다 (메모리 누수 방지)
    return () => { supabase.removeChannel(subscription); };
  }, []);

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
              latitude: Number(shuttle.lat),
              longitude: Number(shuttle.lng),
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
            // 🚀 [핵심 수정] 내 위치 및 조작 버튼 활성화
            showsUserLocation={true}       // 내 위치를 파란색 점으로 표시합니다.
            showsMyLocationButton={true}   // 내 위치로 카메라를 돌리는 버튼을 띄웁니다.
            mapPadding={{ top: 0, right: 0, bottom: 180, left: 0 }} // 하단 카드에 가려지지 않게 여백을 180으로 확대합니다.
          >
            {/* 🚀 [버스 마커] 셔틀버스의 현재 위치를 나타내는 아이콘입니다. */}
            <Marker 
              key={`${shuttle.shuttle_id}-${shuttle.lat}-${shuttle.lng}`} // 💡 고유 키값을 매칭하여 마커가 유령처럼 사라지지 않고 강제 렌더링되게 만듭니다.
              coordinate={{ latitude: Number(shuttle.lat), longitude: Number(shuttle.lng) }} 
              title="셔틀버스"
              tracksViewChanges={true} // 🚨 [버그 수정] false에서 true로 변경하여 실시간 움직임이 지도에 즉시 반영되도록 고쳤습니다!
            >
              <View style={styles.markerContainer}>
                <Ionicons name="bus" size={24} color="#6366F1" />
              </View>
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
        <View style={styles.loadingBox}><ActivityIndicator color="#6366F1" /></View>
      ) : shuttle ? (
        <View style={styles.driverCard}>
          <View style={styles.cardHeader}>
            <View style={styles.driverProfile}>
              <View style={styles.avatar}><Ionicons name="bus" size={24} color="#6366F1" /></View>
              <View>
                <Text style={styles.driverName}>현재 운행 중인 셔틀</Text>
                <Text style={styles.carNumber}>ID: {shuttle.shuttle_id ? shuttle.shuttle_id.substring(0, 8) : "확인중"}...</Text>
              </View>
            </View>
            {/* 기사님께 전화 거는 버튼 (현재는 알림창만 띄움) */}
            <TouchableOpacity style={styles.callBtn} onPress={() => Alert.alert("알림", "연락처가 등록되지 않았습니다.")}>
              <Feather name="phone-call" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <View style={styles.liveIndicator}><View style={styles.redDot} /><Text style={styles.liveText}>실시간</Text></View>
            <Text style={styles.statusMsg}>위치가 실시간 업데이트 중입니다.</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  mapArea: { flex: 1, backgroundColor: '#E2E8F0' },
  emptyMap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapText: { fontSize: 16, color: '#94A3B8', marginTop: 10, fontWeight: '600' },
  
  // 버스 마커 (아이콘 테두리) 디자인
  markerContainer: {
    backgroundColor: '#FFF',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6366F1',
    elevation: 5, // 안드로이드 그림자
    shadowColor: '#000', // iOS 그림자
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  loadingBox: { position: 'absolute', bottom: 50, alignSelf: 'center' },
  // 하단 정보 카드 디자인
  driverCard: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 24, padding: 20, elevation: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverProfile: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  driverName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  carNumber: { fontSize: 13, color: '#64748B', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  redDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 5 },
  liveText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  statusMsg: { fontSize: 14, color: '#475569', fontWeight: '600' }
});

export default RealtimeMapScreen;