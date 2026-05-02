import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // 👈 경로 확인!
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

export default function AttendanceScreen({ navigation }: any) {
  // 1. 상태 관리 (초기값은 비워둡니다)
  const [activeChildId, setActiveChildId] = useState(''); 
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 💡 테스트용 자녀 목록 (나중에 로그인이 구현되면 실제 아이 ID를 여기에 넣게 됩니다)
  const childrenList = [
    { id: '550e8400-e29b-41d4-a716-446655440000', name: '김강태' }, // 실제 DB에 있는 UUID를 넣어야 에러가 안나요!
    { id: '임시_ID_2', name: '김수민' }
  ];

  // 달력용 가짜 데이터 (복구)
  const weekDates = [
    { day: '월', date: '27' }, { day: '화', date: '28' }, { day: '수', date: '29' },
    { day: '목', date: '30' }, { day: '금', date: '01' }, { day: '토', date: '02', isToday: true },
    { day: '일', date: '03' },
  ];
  const [selectedDate, setSelectedDate] = useState('02');

  useEffect(() => {
    // 처음에 첫 번째 아이를 선택
    if (childrenList.length > 0) setActiveChildId(childrenList[0].id);
  }, []);

  const fetchAttendanceData = async () => {
    if (!activeChildId || activeChildId.includes('아이_UUID')) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const todayStr = dayjs().format('YYYY-MM-DD');
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('child_id', activeChildId)
        .eq('date', todayStr)
        .single();

      if (!error) setAttendance(data);
      else setAttendance(null); // 데이터 없으면 null
    } catch (e) {
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [activeChildId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. 상단 헤더 */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>출석 및 동선</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 2. 자녀 선택 칩 */}
      <View style={styles.chipContainer}>
        {childrenList.map((child) => (
          <TouchableOpacity 
            key={child.id}
            style={[styles.childChip, activeChildId === child.id && styles.activeChildChip]}
            onPress={() => setActiveChildId(child.id)}
          >
            <Text style={[styles.childChipText, activeChildId === child.id && styles.activeChildChipText]}>
              {child.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 3. 주간 날짜 선택 (복구됨) */}
      <View style={styles.weekContainer}>
        {weekDates.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.dateBox, selectedDate === item.date && styles.activeDateBox]}
            onPress={() => setSelectedDate(item.date)}
          >
            <Text style={[styles.dayText, selectedDate === item.date && styles.activeDateText]}>{item.day}</Text>
            <Text style={[styles.dateText, selectedDate === item.date && styles.activeDateText]}>{item.date}</Text>
            {item.isToday && <View style={styles.todayDot} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.timelineWrapper}>
          <Text style={styles.timelineHeader}>{dayjs().format('M월 D일 dddd')} 일정</Text>
          
          {loading ? (
            <ActivityIndicator size="small" color="#6366F1" style={{ marginTop: 50 }} />
          ) : !attendance ? (
            // 💡 데이터가 없을 때 띄워줄 화면
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={64} color="#E2E8F0" />
              <Text style={styles.emptyText}>오늘은 등록된 일정이 없습니다.</Text>
            </View>
          ) : (
            // 💡 데이터가 있을 때만 타임라인 렌더링 (기존 로직 동일)
            <View style={styles.timeline}>
               {/* 여기에 기존 타임라인 데이터.map 부분 위치 */}
               <Text>실제 데이터가 있으면 여기에 타임라인이 뜹니다!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  appBarTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  container: { flex: 1 },
  chipContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  childChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 10 },
  activeChildChip: { backgroundColor: '#111827' },
  childChipText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  activeChildChipText: { color: '#FFFFFF' },
  weekContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dateBox: { alignItems: 'center', width: 44, height: 60, justifyContent: 'center', borderRadius: 12 },
  activeDateBox: { backgroundColor: '#6366F1' },
  dayText: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 4 },
  dateText: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  activeDateText: { color: '#FFFFFF' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#EF4444', position: 'absolute', top: 6, right: 6 },
  timelineWrapper: { padding: 24 },
  timelineHeader: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 24 },
  // 데이터 없을 때 스타일
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  timeline: { flex: 1 },
});