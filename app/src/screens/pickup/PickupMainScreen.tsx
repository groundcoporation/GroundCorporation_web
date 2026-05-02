import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // 👈 팀장님 프로젝트의 supabase 설정 경로

export default function PickupMainScreen({ navigation }: any) {
  // 💡 [테스트용] 현재는 이용권이 있는 것으로 설정 (false로 바꾸면 구매 팝업이 뜹니다)
  const [hasPickupPass, setHasPickupPass] = useState(true); 
  
  // 실시간 상태 관리
  const [isDriving, setIsDriving] = useState(false); // 기사님 운행 여부
  const [pickupInfo, setPickupInfo] = useState<any>(null); // 내 픽업 설정 정보[cite: 2]
  const [loading, setLoading] = useState(true);

  // 테스트용 아이 UUID (DB의 실제 UUID로 교체해서 테스트하세요)
  const TEST_CHILD_ID = "550e8400-e29b-41d4-a716-446655440000";

  // 1. DB에서 실시간 데이터 및 설정 정보 가져오기
  const fetchLiveStatus = async () => {
    try {
      setLoading(true);

      // (1) 기사님 운행 상태 확인 (shuttle_status 테이블)[cite: 2]
      const { data: shuttleData } = await supabase
        .from('shuttle_status')
        .select('is_driving')
        .eq('is_driving', true)
        .limit(1)
        .single();
      setIsDriving(!!shuttleData);

      // (2) 내 픽업 설정 정보 확인 (pickup_settings 테이블)[cite: 2]
      const { data: settingsData } = await supabase
        .from('pickup_settings')
        .select('*')
        .eq('child_id', TEST_CHILD_ID)
        .single();
      setPickupInfo(settingsData);

    } catch (error) {
      console.log("데이터 조회 실패 또는 데이터 없음:", error);
      setPickupInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 초기 데이터 로드
    fetchLiveStatus();

    // 💡 [중요] 이용권 없는 사용자 차단 로직[cite: 2]
    if (!hasPickupPass) {
      Alert.alert(
        "이용권 필요",
        "픽업 서비스 이용권이 없습니다. 구매 페이지로 이동할까요?",
        [
          { text: "나중에", onPress: () => navigation.goBack(), style: "cancel" },
          { text: "구매하기", onPress: () => navigation.navigate("Pass") } 
        ]
      );
    }

    // 💡 셔틀 운행 상태 실시간 감시 (기사님이 상태 변경 시 즉시 반영)[cite: 2]
    const shuttleSubscription = supabase
      .channel('live_shuttle_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shuttle_status' }, fetchLiveStatus)
      .subscribe();

    return () => { supabase.removeChannel(shuttleSubscription); };
  }, [hasPickupPass]); // 이용권 상태가 바뀔 때마다 체크[cite: 2]

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 앱바 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>픽업 관리</Text>
        <TouchableOpacity onPress={() => navigation.navigate("PickupApply")}>
          <Ionicons name="settings-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. 실시간 셔틀 위치 카드[cite: 2] */}
        <View style={[styles.statusCard, isDriving ? styles.activeCard : styles.inactiveCard]}>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: isDriving ? '#EF4444' : '#94A3B8' }]} />
            <Text style={styles.statusText}>{isDriving ? "실시간 운행 중" : "운행 대기"}</Text>
          </View>
          <Text style={styles.cardTitle}>
            {isDriving ? "셔틀버스가 이동 중입니다" : "현재 운행 중인 셔틀이 없습니다"}
          </Text>
          
          <TouchableOpacity 
            style={[styles.mapBtn, !isDriving && styles.disabledBtn]}
            onPress={() => isDriving && navigation.navigate("RealtimeMap")}
            disabled={!isDriving}
          >
            <Text style={styles.mapBtnText}>실시간 위치 확인하기</Text>
            <MaterialCommunityIcons name="map-marker-radius" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* 2. 내 픽업 정보 요약 (DB 데이터 반영)[cite: 2] */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>나의 픽업 정보</Text>
          <View style={styles.infoCard}>
            {pickupInfo ? (
              <>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="bus-side" size={20} color="#6366F1" />
                  <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>{pickupInfo.area} 탑승지</Text>
                    <Text style={styles.infoValue}>{pickupInfo.apartment} {pickupInfo.detail_location}</Text>
                  </View>
                </View>
                <View style={[styles.infoRow, { marginTop: 15 }]}>
                  <MaterialCommunityIcons name="home-export-outline" size={20} color="#10B981" />
                  <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>하원 정보</Text>
                    <Text style={styles.infoValue}>지정된 장소에서 하차 (등원과 동일)</Text>
                  </View>
                </View>
              </>
            ) : (
              <TouchableOpacity 
                style={styles.emptyInfoContainer}
                onPress={() => navigation.navigate("PickupApply")}
              >
                <Ionicons name="add-circle-outline" size={32} color="#6366F1" />
                <Text style={styles.emptyInfoText}>등록된 픽업 정보가 없습니다.{"\n"}여기를 눌러 정보를 설정해주세요.</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. 예외 처리 버튼 (하원 방식 변경)[cite: 1, 2] */}
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => Alert.alert("준비 중", "오늘의 하원 방식 변경 기능은 곧 업데이트됩니다.")}
        >
          <Text style={styles.actionBtnText}>오늘 하원 방식 변경하기</Text>
          <Ionicons name="swap-horizontal" size={20} color="#6366F1" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  scrollContent: { padding: 20 },
  
  statusCard: { padding: 24, borderRadius: 20, marginBottom: 25 },
  activeCard: { backgroundColor: '#1E293B' },
  inactiveCard: { backgroundColor: '#E2E8F0' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  cardTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 20, lineHeight: 28 },
  
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', paddingVertical: 15, borderRadius: 12 },
  disabledBtn: { backgroundColor: '#94A3B8' },
  mapBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', marginRight: 8 },
  
  infoSection: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  infoCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoTexts: { marginLeft: 12 },
  infoLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#1E293B', fontWeight: '800', marginTop: 2 },
  
  emptyInfoContainer: { alignItems: 'center', paddingVertical: 10 },
  emptyInfoText: { color: '#6366F1', fontWeight: '700', textAlign: 'center', marginTop: 10, lineHeight: 20 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: '#6366F1', borderStyle: 'dashed' },
  actionBtnText: { color: '#6366F1', fontSize: 15, fontWeight: '800', marginRight: 8 },
});