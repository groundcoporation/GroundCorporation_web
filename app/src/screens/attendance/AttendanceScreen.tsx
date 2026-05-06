import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

export default function AttendanceScreen({ navigation }: any) {
  const [activeChildId, setActiveChildId] = useState(''); 
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 📅 날짜 관련 상태
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 1. 자녀 목록 가져오기
  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('children')
      .select('id, child_name')
      .eq('parent_id', user.id);

    if (data && data.length > 0) {
      setChildrenList(data);
      setActiveChildId(data[0].id);
    }
    setLoading(false);
  };

  // 2. 선택된 아이 + 선택된 날짜의 로그 가져오기
  const fetchAttendanceData = async () => {
    if (!activeChildId) return;
    
    try {
      setLoading(true);
      const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('child_id', activeChildId)
        .eq('date', dateStr)
        .maybeSingle();

      setAttendance(data || null);
    } catch (e) {
      console.error(e);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [activeChildId, selectedDate]);

  // 🚀 날짜 변경 핸들러
  const onChangeDate = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const shiftDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  // 3. 타임라인 아이템 렌더링
  const renderTimelineItem = (time: string, label: string, icon: any, isLast = false) => {
    if (!time) return null;
    
    const displayTime = time.includes(':') 
      ? dayjs(`${dayjs(selectedDate).format('YYYY-MM-DD')} ${time}`).format('A h:mm') 
      : dayjs(time).format('A h:mm');

    return (
      <View style={styles.timelineItem}>
        <View style={styles.lineWrapper}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={icon} size={20} color="#6366F1" />
          </View>
          {!isLast && <View style={styles.verticalLine} />}
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.timeText}>{displayTime}</Text>
          <Text style={styles.labelTitle}>{label}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={28} color="#111827" /></TouchableOpacity>
        <Text style={styles.appBarTitle}>출석 및 동선 확인</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 📅 날짜 네비게이터 (좌우 화살표) */}
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={24} color="#6366F1" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateCenter}>
          <Ionicons name="calendar-outline" size={18} color="#6366F1" style={{ marginRight: 6 }} />
          <Text style={styles.selectedDateText}>
            {dayjs(selectedDate).format('YYYY년 M월 D일 (dd)')}
          </Text>
          <Ionicons name="caret-down" size={14} color="#94A3B8" style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => shiftDate(1)} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onChangeDate}
          maximumDate={new Date()} // 오늘 이후 날짜는 선택 불가하게 설정 가능
        />
      )}

      {/* 자녀 선택 */}
      <View style={styles.chipContainer}>
        {childrenList.map((child) => (
          <TouchableOpacity 
            key={child.id}
            style={[styles.childChip, activeChildId === child.id && styles.activeChildChip]}
            onPress={() => setActiveChildId(child.id)}
          >
            <Text style={[styles.childChipText, activeChildId === child.id && styles.activeChildChipText]}>{child.child_name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.timelineWrapper}>
          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 50 }} />
          ) : !attendance ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={64} color="#E2E8F0" />
              <Text style={styles.emptyText}>기록된 동선이 없습니다.</Text>
              <Text style={styles.emptySubText}>해당 날짜에는 수업이나 차량 이동이 없었습니다.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {renderTimelineItem(attendance.shuttle_ride_time, "셔틀버스 탑승", "bus-clock")}
              {renderTimelineItem(attendance.shuttle_drop_time, "셔틀버스 하차", "bus-marker")}
              {renderTimelineItem(attendance.check_in, "센터 등원 완료", "door-open")}
              {renderTimelineItem(attendance.check_out, "수업 종료 및 하원", "door-closed")}
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
  
  // 날짜 선택기 스타일
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#F8FAFC' },
  arrowBtn: { padding: 10 },
  dateCenter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  selectedDateText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },

  chipContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  childChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 10 },
  activeChildChip: { backgroundColor: '#111827' },
  childChipText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  activeChildChipText: { color: '#FFFFFF' },

  timelineWrapper: { padding: 24 },
  timeline: { marginLeft: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 25 },
  lineWrapper: { alignItems: 'center', marginRight: 15 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  verticalLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', position: 'absolute', top: 36, bottom: -25 },
  textWrapper: { paddingTop: 4 },
  timeText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  labelTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 2 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  emptySubText: { marginTop: 8, color: '#CBD5E1', fontSize: 13, textAlign: 'center' },
});