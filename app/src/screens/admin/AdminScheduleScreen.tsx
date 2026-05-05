import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  FlatList, Modal, Platform, StatusBar, BackHandler, 
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
  ScrollView 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScheduleScreen() {
  // --- 데이터 상태 ---
  const [branches, setBranches] = useState<any[]>([]); // DB 지점 목록
  const [selectedBranch, setSelectedBranch] = useState(''); // 선택된 지점 ID
  const [activeTab, setActiveTab] = useState<'status' | 'manage'>('manage');
  const [selectedDay, setSelectedDay] = useState('월');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 모달 상태 ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    target_class: '',
    start_time: '14:00:00',
    end_time: '14:50:00',
    min_age: '6',
    max_age: '13',
    max_people: '10'
  });

  const days = ['월', '화', '수', '목', '금', '토', '일'];

  // 🚀 1. 초기 로드: 지점 목록 가져오기
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      // created_at 대신 DB에 있는 display_order 컬럼을 사용합니다.
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        // 💡 id가 'unassigned'가 아닌 것들만 가져오기
        .neq('id', 'unassigned')
        .order('display_order', { ascending: true }); // 숫자 작은 순서대로 정렬 (1 -> 2 -> 99)
      
      if (error) throw error;
      if (data && data.length > 0) {
        setBranches(data);
        setSelectedBranch(data[0].id); // 시흥점(1번)이 먼저 선택됩니다.
      }
    } catch (e) {
      console.error('지점 로드 실패:', e);
    }
  };

  // 🚀 2. 시간표 로드: 지점이나 요일이 바뀔 때 실행
  useEffect(() => {
    if (selectedBranch) {
      fetchSchedules();
    }
  }, [selectedBranch, selectedDay, activeTab]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('branch_id', selectedBranch)
        .eq('day_of_week', selectedDay)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      setSchedules(data || []);
    } catch (e) {
      console.error('시간표 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 3. 지점 스왑 로직 (DB 목록 기반 순회)
  const toggleBranch = () => {
    if (branches.length < 2) return;
    const currentIndex = branches.findIndex(b => b.id === selectedBranch);
    const nextIndex = (currentIndex + 1) % branches.length;
    setSelectedBranch(branches[nextIndex].id);
  };

  // 🚀 4. 안드로이드 뒤로가기 대응
  useEffect(() => {
    const backAction = () => {
      if (isModalVisible) {
        setIsModalVisible(false);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isModalVisible]);

  // 🚀 5. 저장 로직 (지점 ID 자동 할당)
  const handleSave = async () => {
    if (!form.target_class) return Alert.alert("알림", "반 이름을 입력해주세요.");
    
    const payload = {
      ...form,
      branch_id: selectedBranch,
      day_of_week: selectedDay,
      min_age: parseInt(form.min_age),
      max_age: parseInt(form.max_age),
      max_people: parseInt(form.max_people),
    };

    setLoading(true);
    const { error } = editingId 
      ? await supabase.from('class_schedules').update(payload).eq('id', editingId)
      : await supabase.from('class_schedules').insert([payload]);

    if (error) {
      Alert.alert("오류", "저장에 실패했습니다.");
    } else {
      setIsModalVisible(false);
      fetchSchedules();
    }
    setLoading(false);
  };

  const openEdit = (item: any) => {
    setForm({
      target_class: item.target_class,
      start_time: item.start_time,
      end_time: item.end_time,
      min_age: String(item.min_age),
      max_age: String(item.max_age),
      max_people: String(item.max_people),
    });
    setEditingId(item.id);
    setIsModalVisible(true);
  };

  // 현재 선택된 지점 객체 찾기
  const currentBranch = branches.find(b => b.id === selectedBranch);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. 헤더 (DB 연동 명칭) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>ADMIN DASHBOARD</Text>
          <Text style={styles.headerTitle}>
            🏫 {currentBranch?.name || '지점 로딩 중...'}
          </Text>
        </View>
        {branches.length > 1 && (
          <TouchableOpacity style={styles.branchToggle} onPress={toggleBranch}>
            <Ionicons name="swap-horizontal" size={20} color="#6366F1" />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. 상단 메뉴 탭 */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'status' && styles.activeTabItem]}
          onPress={() => setActiveTab('status')}
        >
          <Text style={[styles.tabLabel, activeTab === 'status' && styles.activeTabLabel]}>예약/출석</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'manage' && styles.activeTabItem]}
          onPress={() => setActiveTab('manage')}
        >
          <Text style={[styles.tabLabel, activeTab === 'manage' && styles.activeTabLabel]}>시간표 설정</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'manage' ? (
        <View style={{ flex: 1 }}>
          {/* 3. 요일 선택 바 */}
          <View style={styles.weekBar}>
            {days.map(day => (
              <TouchableOpacity 
                key={day} 
                style={[styles.dayCard, selectedDay === day && styles.activeDayCard]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayText, selectedDay === day && styles.activeDayText]}>{day}</Text>
                {selectedDay === day && <View style={styles.dot} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* 4. 시간표 리스트 */}
          {loading && schedules.length === 0 ? (
            <ActivityIndicator size="large" style={{ marginTop: 100 }} color="#6366F1" />
          ) : (
            <FlatList
              data={schedules}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
                  <View style={styles.cardTimeBox}>
                    <Text style={styles.cardTime}>{item.start_time.slice(0,5)}</Text>
                    <View style={styles.timeLine} />
                    <Text style={styles.cardTimeEnd}>{item.end_time.slice(0,5)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardClassName}>{item.target_class}</Text>
                    <Text style={styles.cardDetail}>
                      {item.min_age}-{item.max_age}세 · 정원 {item.max_people}명
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#E2E8F0" />
                  <Text style={styles.emptyText}>등록된 수업 일정이 없습니다.</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => {
              setEditingId(null);
              setForm({ target_class: '', start_time: '14:00:00', end_time: '14:50:00', min_age: '6', max_age: '13', max_people: '10' });
              setIsModalVisible(true);
            }}
          >
            <Ionicons name="add" size={30} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={{ color: '#94A3B8' }}>출석 체크 기능 준비 중입니다.</Text>
        </View>
      )}

      {/* --- 입력/수정 모달 --- */}
      <Modal visible={isModalVisible} animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? '수업 일정 수정' : '새 수업 등록'}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.label}>프로그램 명</Text>
              <TextInput 
                style={styles.input} 
                value={form.target_class} 
                onChangeText={(t) => setForm({...form, target_class: t})}
                placeholder="예: 초등부 저학년반"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>시작 시간</Text>
                  <TextInput style={styles.input} value={form.start_time} onChangeText={(t) => setForm({...form, start_time: t})} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>종료 시간</Text>
                  <TextInput style={styles.input} value={form.end_time} onChangeText={(t) => setForm({...form, end_time: t})} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>최소 연령</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.min_age} onChangeText={(t) => setForm({...form, min_age: t})} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>최대 연령</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.max_age} onChangeText={(t) => setForm({...form, max_age: t})} />
                </View>
              </View>

              <Text style={styles.label}>최대 정원</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.max_people} onChangeText={(t) => setForm({...form, max_people: t})} />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>데이터베이스 저장</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 20,
    backgroundColor: '#FFF'
  },
  headerSubtitle: { fontSize: 10, color: '#6366F1', fontWeight: '900', letterSpacing: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginTop: 2 },
  branchToggle: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 24 },
  tabItem: { paddingVertical: 14, marginRight: 24, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTabItem: { borderBottomColor: '#6366F1' },
  tabLabel: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  activeTabLabel: { color: '#1E293B' },

  weekBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF' },
  dayCard: { width: 40, height: 50, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  activeDayCard: { backgroundColor: '#1E1B4B', elevation: 4 },
  dayText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  activeDayText: { color: '#FFF' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6366F1', marginTop: 4 },

  listContent: { padding: 20, paddingBottom: 100 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 18, 
    marginBottom: 12, 
    alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 
  },
  cardTimeBox: { width: 50, alignItems: 'center' },
  cardTime: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  cardTimeEnd: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  timeLine: { width: 1.5, height: 10, backgroundColor: '#E2E8F0', marginVertical: 3 },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardClassName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  cardDetail: { fontSize: 12, color: '#64748B' },

  fab: { 
    position: 'absolute', bottom: 30, right: 24, 
    width: 60, height: 60, borderRadius: 30, 
    backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 10 
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 12, color: '#94A3B8', fontSize: 13 },

  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 15 },
  input: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, fontSize: 15, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  row: { flexDirection: 'row' },
  submitBtn: { backgroundColor: '#1E1B4B', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30, marginBottom: 30 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});