import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function ReservationListScreen() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        class_schedules ( target_class, start_time, end_time )
      `)
      .eq('user_id', user.id)
      .order('class_date', { ascending: false });

    if (data) setReservations(data);
    setLoading(false);
  };

  // 🚀 취소 신청 로직 (수업 2시간 전 체크 추가)
  const requestCancel = async (item: any) => {
    // 💡 현재 시간과 수업 시간 비교
    const now = new Date();
    const classDateTime = new Date(`${item.class_date}T${item.class_schedules?.start_time}`);
    const diffMs = classDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 2) {
      return Alert.alert("취소 불가", "수업 시작 2시간 이내에는 앱에서 취소가 불가능합니다. 지점으로 연락주세요.");
    }

    Alert.alert("취소 신청", "수업 취소를 신청하시겠습니까? 코치 승인 후 수강권이 복구됩니다.", [
      { text: "아니오" },
      { 
        text: "신청하기", 
        onPress: async () => {
          const { error } = await supabase
            .from('reservations')
            .update({ status: 'cancel_requested' })
            .eq('id', item.id);
          
          if (!error) {
            Alert.alert("알림", "취소 신청이 완료되었습니다.");
            fetchReservations();
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: any) => {
    // 1. 예약 상태 (status 컬럼)
    const getResStatus = () => {
      if (item.status === 'cancel_requested') return { label: '취소대기', color: '#F59E0B', bg: '#FFFBEB' };
      if (item.status === 'canceled') return { label: '취소완료', color: '#EF4444', bg: '#FEF2F2' };
      return { label: '예약확정', color: '#10B981', bg: '#ECFDF5' };
    };

    // 2. 출결 상태 (attendance_status 컬럼)
    const getAttStatus = () => {
      if (!item.attendance_status || item.attendance_status === '확인전') return null;
      return { label: item.attendance_status, color: '#6366F1', bg: '#EEF2FF' };
    };

    const resStatus = getResStatus();
    const attStatus = getAttStatus();

    return (
      <View style={styles.card}>
        {/* 상단: 날짜 및 예약 상태(예약확정/취소대기 등) */}
        <View style={styles.cardHeader}>
          <View style={styles.dateGroup}>
            <Text style={styles.dateText}>{item.class_date}</Text>
            <Text style={styles.childText}>{item.child_name} 학생</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: resStatus.bg }]}>
            <Text style={[styles.statusLabel, { color: resStatus.color }]}>{resStatus.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.classTitle}>{item.class_schedules?.target_class}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.timeText}>{item.class_schedules?.start_time.slice(0, 5)} 시작</Text>
          </View>
        </View>

        {/* 🚀 하단: 출결 상태 (등원/하원/결석/보강이 찍혔을 때만 등장) */}
        {attStatus && (
          <View style={[styles.attBox, { backgroundColor: attStatus.bg }]}>
            <Text style={[styles.attText, { color: attStatus.color }]}>
              📍 출결 확인: {attStatus.label}
            </Text>
          </View>
        )}

        {/* 취소 버튼 영역: 출결 전 + 취소 완료 전일 때만 */}
        {!attStatus && item.status === 'pending' && (
          <TouchableOpacity onPress={() => requestCancel(item)} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>예약 취소 신청</Text>
          </TouchableOpacity>
        )}

        {item.status === 'cancel_requested' && (
          <View style={styles.waitBox}>
            <Text style={styles.waitText}>관리자의 취소 승인을 기다리고 있습니다.</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#6366F1" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>나의 수업 예약</Text>
      </View>
      <FlatList
        data={reservations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.emptyText}>예약 내역이 없습니다.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingVertical: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    marginBottom: 16, 
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  dateGroup: { gap: 2 },
  dateText: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  childText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusLabel: { fontSize: 12, fontWeight: '900' },

  cardBody: { marginBottom: 15 },
  classTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 14, color: '#64748B', fontWeight: '600' },

  attBox: { padding: 12, borderRadius: 12, marginBottom: 10 },
  attText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },

  cancelBtn: { marginTop: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: '#94A3B8', fontWeight: '700', textDecorationLine: 'underline' },
  
  waitBox: { marginTop: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
  waitText: { fontSize: 12, color: '#F59E0B', fontWeight: '700' },

  emptyText: { textAlign: 'center', marginTop: 100, color: '#94A3B8', fontSize: 15 }
});