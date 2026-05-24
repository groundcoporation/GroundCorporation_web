import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps'; 
import { supabase } from '../../lib/supabase';

const RealtimeMapScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [shuttle, setShuttle] = useState<any>(null);
  const mapRef = useRef<MapView>(null); 

  const fetchShuttleStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shuttle_status')
        .select('*')
        .eq('is_driving', true)
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

  useEffect(() => {
    fetchShuttleStatus();

    const subscription = supabase
      .channel('shuttle_move')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'shuttle_status' 
      }, payload => {
        console.log("📡 [관제 수신] 데이터 수신 성공:", payload.new.lat, payload.new.lng);

        if (payload.new && payload.new.is_driving) {
          setShuttle(payload.new);
          mapRef.current?.animateToRegion({
            latitude: payload.new.lat,
            longitude: payload.new.lng,
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          }, 1000);
        } else {
          setShuttle(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>실시간 셔틀 위치</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.mapArea}>
        {shuttle?.lat && shuttle?.lng ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: shuttle.lat,
              longitude: shuttle.lng,
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
          >
            {/* 🚀 [마커 모양 변경 영역] 여기서 모양이나 아이콘을 바꾸세요 */}
            <Marker 
              coordinate={{ latitude: shuttle.lat, longitude: shuttle.lng }} 
              title="셔틀버스"
              tracksViewChanges={false} // 마커가 튀는 현상 방지
            >
              <View style={styles.markerContainer}>
                {/* 나중에 다른 모양으로 바꾸려면 name="bus"를 다른 아이콘으로 변경하세요 */}
                <Ionicons name="bus" size={24} color="#6366F1" />
              </View>
            </Marker>
          </MapView>
        ) : (
          <View style={styles.emptyMap}>
            <Ionicons name="map-outline" size={64} color="#CBD5E1" />
            <Text style={styles.mapText}>현재 운행 중인 셔틀이 없습니다.</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color="#6366F1" /></View>
      ) : shuttle ? (
        <View style={styles.driverCard}>
          <View style={styles.cardHeader}>
            <View style={styles.driverProfile}>
              <View style={styles.avatar}><Ionicons name="bus" size={24} color="#6366F1" /></View>
              <View>
                <Text style={styles.driverName}>현재 운행 중인 셔틀</Text>
                <Text style={styles.carNumber}>ID: {shuttle.shuttle_id.substring(0, 8)}...</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => Alert.alert("알림", "연락처가 등록되지 않았습니다.")}>
              <Feather name="phone-call" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <View style={styles.liveIndicator}><View style={styles.redDot} /><Text style={styles.liveText}>실시간</Text></View>
            <Text style={styles.statusMsg}>위치가 10초 주기로 업데이트 중입니다.</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  mapArea: { flex: 1, backgroundColor: '#E2E8F0' },
  emptyMap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapText: { fontSize: 16, color: '#94A3B8', marginTop: 10, fontWeight: '600' },
  
  // 🚀 [마커 모양 스타일] 배경색, 테두리 등을 여기서 수정하세요
  markerContainer: {
    backgroundColor: '#FFF',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6366F1',
    elevation: 5, // 그림자 효과 (안드로이드)
    shadowColor: '#000', // 그림자 효과 (iOS)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  loadingBox: { position: 'absolute', bottom: 50, alignSelf: 'center' },
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