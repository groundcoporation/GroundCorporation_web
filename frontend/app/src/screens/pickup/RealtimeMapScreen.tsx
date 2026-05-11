import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; //

const RealtimeMapScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [shuttle, setShuttle] = useState<any>(null);

  // 💡 1. DB에서 실시간 셔틀 상태 가져오기
  const fetchShuttleStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shuttle_status')
        .select('*')
        .eq('is_driving', true) // 현재 운행 중인 셔틀만 조회
        .limit(1)
        .single();

      if (!error) {
        setShuttle(data);
      } else {
        setShuttle(null); // 데이터가 없거나 에러 시 null
      }
    } catch (e) {
      setShuttle(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShuttleStatus();

    // 💡 2. (선택) 실시간 리스너 추가 - 기사님이 위치를 쏠 때마다 자동 갱신
    const subscription = supabase
      .channel('shuttle_move')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shuttle_status' }, 
        payload => setShuttle(payload.new))
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 앱바 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>실시간 셔틀 위치</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 지도 영역 */}
      <View style={styles.mapArea}>
        <Ionicons name="map-outline" size={64} color="#CBD5E1" />
        <Text style={styles.mapText}>
          {shuttle ? "기사님 실시간 위치 추적 중" : "지도가 여기에 렌더링됩니다"}
        </Text>
      </View>

      {/* 하단 정보 카드: 데이터가 있을 때만 렌더링 */}
      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color="#6366F1" /></View>
      ) : shuttle ? (
        <View style={styles.driverCard}>
          <View style={styles.cardHeader}>
            <View style={styles.driverProfile}>
              <View style={styles.avatar}><Ionicons name="bus" size={24} color="#6366F1" /></View>
              <View>
                <Text style={styles.driverName}>시흥본점 셔틀</Text>
                <Text style={styles.carNumber}>{shuttle.shuttle_id}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.callBtn}
              onPress={() => Alert.alert("알림", "기사님 연락처가 등록되지 않았습니다.")}
            >
              <Feather name="phone-call" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <View style={styles.liveIndicator}>
              <View style={styles.redDot} /><Text style={styles.liveText}>실시간</Text>
            </View>
            <Text style={styles.statusMsg}>현재 운행 중입니다.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noDriverCard}>
          <Text style={styles.noDriverText}>현재 운행 중인 셔틀 정보가 없습니다.</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  mapArea: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0' },
  mapText: { fontSize: 16, color: '#94A3B8', marginTop: 10, fontWeight: '600' },
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
  statusMsg: { fontSize: 14, color: '#475569', fontWeight: '600' },
  noDriverCard: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 5 },
  noDriverText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' }
});

export default RealtimeMapScreen;