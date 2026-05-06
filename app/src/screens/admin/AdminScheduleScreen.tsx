import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  FlatList, Modal, Platform, StatusBar, BackHandler, 
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
  ScrollView 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; 

export default function AdminScheduleScreen() {
  // --- 데이터 상태 ---
  const [branches, setBranches] = useState<any[]>([]); // DB 지점 목록
  const [selectedBranch, setSelectedBranch] = useState(''); // 선택된 지점 ID
  const [activeTab, setActiveTab] = useState<'status' | 'manage'>('status'); 
  const [selectedDay, setSelectedDay] = useState('월');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 출석 체크 전용 상태 추가 ---
  const [currentDate, setCurrentDate] = useState(new Date()); // Date 객체로 관리
  const [showDatePicker, setShowDatePicker] = useState(false); // 달력 모달 상태
  const [combinedData, setCombinedData] = useState<any[]>([]); // 시간표 + 예약자 통합 데이터

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

  const days = ['일', '월', '화', '수', '목', '금', '토']; // 요일 배열

  // 🚀 1. 초기 로드: 지점 목록 가져오기
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .neq('id', 'unassigned')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      if (data && data.length > 0) {
        setBranches(data);
        setSelectedBranch(data[0].id);
      }
    } catch (e) {
      console.error('지점 로드 실패:', e);
    }
  };

  // 🚀 2. 데이터 통합 로드 (출석 현황 및 시간표 설정)
  useEffect(() => {
    if (selectedBranch) {
      if (activeTab === 'status') fetchStatusData();
      else fetchManageSchedules();
    }
  }, [selectedBranch, currentDate, selectedDay, activeTab]);

  // [Status 탭] 세로형 타임라인 데이터 (수업 + 예약자)
  const fetchStatusData = async () => {
    setLoading(true);
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayName = days[currentDate.getDay()];
      
      const { data: scheduleData } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('branch_id', selectedBranch)
        .eq('day_of_week', dayName)
        .order('start_time', { ascending: true });
      
      const { data: resData } = await supabase
        .from('reservations')
        .select('*')
        .eq('class_date', dateString);

      const formatted = (scheduleData || []).map(sched => ({
        ...sched,
        reservations: (resData || []).filter(r => r.schedule_id === sched.id)
      }));

      setCombinedData(formatted);
    } catch (e) {
      console.error('현황 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  // [Manage 탭] 시간표 리스트 로드
  const fetchManageSchedules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('branch_id', selectedBranch)
      .eq('day_of_week', selectedDay)
      .order('start_time', { ascending: true });
    setSchedules(data || []);
    setLoading(false);
  };

  // 🚀 3. [핵심수정] 출결 핸들러 (등원, 하원, 결석, 보강 -> 한글로 DB 저장)
  const handleAttendance = async (resId: string, attStatus: string, isMakeup: boolean = false) => {
    const updateData: any = { attendance_status: attStatus };
    
    // 보강 버튼 클릭 시 status 컬럼을 makeup으로 강제 지정
    if (isMakeup) {
      updateData.status = 'makeup';
      updateData.attendance_status = '보강';
    }

    const { error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', resId);
    
    if (!error) fetchStatusData();
    else Alert.alert("오류", "업데이트 실패");
  };

  // 🚀 4. [신규 추가] 취소 승인 및 수강권 자동 복구 핸들러
  const handleApproveCancel = async (reservation: any) => {
    Alert.alert("취소 승인", "해당 예약을 취소 승인하고 수강권을 1회 복구하시겠습니까?", [
      { text: "아니오" },
      { 
        text: "승인 및 복구", 
        onPress: async () => {
          try {
            // 1. 예약 상태를 canceled로, 출결상태를 취소완료로 변경
            const { error: resError } = await supabase
              .from('reservations')
              .update({ status: 'canceled', attendance_status: '취소완료' })
              .eq('id', reservation.id);

            if (resError) throw resError;

            // 2. 수강권 복구 (예약 시 사용했던 패키지 ID가 있는 경우)
            if (reservation.user_package_id) {
              const { data: pkg, error: pkgFetchError } = await supabase
                .from('user_packages')
                .select('remaining_count')
                .eq('id', reservation.user_package_id)
                .single();

              if (!pkgFetchError && pkg) {
                await supabase
                  .from('user_packages')
                  .update({ remaining_count: pkg.remaining_count + 1 })
                  .eq('id', reservation.user_package_id);
              }
            }

            Alert.alert("성공", "취소 승인 및 수강권 복구가 완료되었습니다.");
            fetchStatusData();
          } catch (e) {
            Alert.alert("오류", "처리에 실패했습니다.");
          }
        }
      }
    ]);
  };

  // 🚀 5. 달력 핸들러 및 날짜 이동 로직
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  };

  // 💡 [추가] 날짜를 하루씩 앞뒤로 이동하는 함수
  const changeDate = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + offset);
    setCurrentDate(newDate);
  };

  // 🚀 6. 지점 스왑 로직
  const toggleBranch = () => {
    if (branches.length < 2) return;
    const currentIndex = branches.findIndex(b => b.id === selectedBranch);
    const nextIndex = (currentIndex + 1) % branches.length;
    setSelectedBranch(branches[nextIndex].id);
  };

  // 🚀 7. 안드로이드 뒤로가기 대응
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

  // 🚀 8. 저장 로직
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
      fetchManageSchedules();
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
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* 1. 헤더 (상단 시간 겹침 방지 여백 포함) */}
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

        {activeTab === 'status' ? (
          <View style={{ flex: 1 }}>
            {/* 📅 날짜 선택 바 (좌우 화살표 + 디자인 개선) */}
            <View style={styles.statusDateHeader}>
              <View style={styles.dateNavigator}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={24} color="#6366F1" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateCenterBtn}>
                  <Ionicons name="calendar-outline" size={20} color="#6366F1" style={{ marginRight: 8 }} />
                  <Text style={styles.statusDateText}>
                    {currentDate.toISOString().split('T')[0]} ({days[currentDate.getDay()]})
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94A3B8" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={24} color="#6366F1" />
                </TouchableOpacity>
              </View>
              {loading && <ActivityIndicator size="small" color="#6366F1" style={{ marginTop: 10 }} />}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={currentDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
              />
            )}

            {/* 📋 출석 명단 리스트 */}
            <FlatList
              data={combinedData}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              renderItem={({ item }) => (
                <View style={styles.timeSection}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.timeTag}><Text style={styles.timeTagText}>{item.start_time.slice(0,5)}</Text></View>
                    <Text style={styles.sectionTitleText}>{item.target_class}</Text>
                    <Text style={styles.sectionCountText}>{item.reservations.length}명</Text>
                  </View>

                  {item.reservations.length > 0 ? (
                    item.reservations.map((res: any) => (
                      <View key={res.id} style={[
                        styles.statusItemCard,
                        res.status === 'cancel_requested' && { borderLeftColor: '#F59E0B', borderLeftWidth: 6 },
                        res.attendance_status === '등원' && styles.cardCheckIn,
                        res.attendance_status === '하원' && styles.cardCheckOut,
                        res.attendance_status === '결석' && styles.cardAbsent,
                        res.attendance_status === '보강' && styles.cardMakeup
                      ]}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.statusChildName}>{res.child_name}</Text>
                            {res.status === 'cancel_requested' && (
                              <View style={styles.cancelWaitBadge}><Text style={styles.cancelWaitText}>취소요청</Text></View>
                            )}
                            {(res.status === 'makeup' || res.attendance_status === '보강') && (
                              <View style={styles.makeupBadge}><Text style={styles.makeupText}>보강</Text></View>
                            )}
                          </View>
                          <Text style={styles.statusSubText}>
                            상태: {res.attendance_status || (res.status === 'cancel_requested' ? '취소대기' : '확인전')}
                          </Text>
                        </View>
                        
                        <View style={styles.statusBtnGroup}>
                          {res.status === 'cancel_requested' ? (
                            <TouchableOpacity 
                              onPress={() => handleApproveCancel(res)}
                              style={styles.approveCancelBtn}
                            >
                              <Text style={styles.approveCancelBtnText}>취소승인(복구)</Text>
                            </TouchableOpacity>
                          ) : (
                            <>
                              <TouchableOpacity 
                                onPress={() => handleAttendance(res.id, '등원')}
                                style={[styles.statusSmallBtn, res.attendance_status === '등원' && styles.active등원]}
                              >
                                <Text style={[styles.statusSmallBtnText, res.attendance_status === '등원' && styles.textWhite]}>등원</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleAttendance(res.id, '하원')}
                                style={[styles.statusSmallBtn, res.attendance_status === '하원' && styles.active하원]}
                              >
                                <Text style={[styles.statusSmallBtnText, res.attendance_status === '하원' && styles.textWhite]}>하원</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleAttendance(res.id, '결석')}
                                style={[styles.statusSmallBtn, res.attendance_status === '결석' && styles.active결석]}
                              >
                                <Text style={[styles.statusSmallBtnText, res.attendance_status === '결석' && styles.textWhite]}>결석</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleAttendance(res.id, '보강', true)}
                                style={[styles.statusSmallBtn, (res.status === 'makeup' || res.attendance_status === '보강') && styles.active보강]}
                              >
                                <Text style={[styles.statusSmallBtnText, (res.status === 'makeup' || res.attendance_status === '보강') && styles.textWhite]}>보강</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyStatusBox}>
                      <Text style={styles.emptyStatusText}>예약된 인원이 없습니다.</Text>
                    </View>
                  )}
                </View>
              )}
              onRefresh={fetchStatusData}
              refreshing={loading}
            />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* 3. 요일 선택 바 */}
            <View style={styles.weekBar}>
              {['월', '화', '수', '목', '금', '토', '일'].map(day => (
                <TouchableOpacity 
                  key={day} 
                  style={[styles.dayCard, selectedDay === day && styles.activeDayCard]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayText, selectedDay === day && styles.activeDayText]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 4. 시간표 리스트 */}
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
            />

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
        )}

        {/* --- 수업 설정 모달 --- */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 20,
    backgroundColor: '#FFF'
  },
  headerSubtitle: { fontSize: 10, color: '#6366F1', fontWeight: '900', letterSpacing: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginTop: 2 },
  branchToggle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabItem: { paddingVertical: 14, marginRight: 24, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTabItem: { borderBottomColor: '#6366F1' },
  tabLabel: { fontSize: 16, fontWeight: '600', color: '#94A3B8' },
  activeTabLabel: { color: '#1E293B', fontWeight: '800' },

  statusDateHeader: { padding: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dateNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: 10, borderRadius: 12, backgroundColor: '#F8FAFC' },
  dateCenterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15 },
  statusDateText: { fontSize: 16, fontWeight: '800', color: '#4F46E5' },

  timeSection: { marginBottom: 30 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timeTag: { backgroundColor: '#4F46E5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  timeTagText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  sectionTitleText: { fontSize: 18, fontWeight: '800', color: '#1E293B', flex: 1 },
  sectionCountText: { fontSize: 14, color: '#6366F1', fontWeight: '700' },
  
  statusItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 20, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardCheckIn: { borderLeftWidth: 6, borderLeftColor: '#6366F1' },
  cardCheckOut: { borderLeftWidth: 6, borderLeftColor: '#10B981' },
  cardAbsent: { borderLeftWidth: 6, borderLeftColor: '#EF4444' },
  cardMakeup: { borderLeftWidth: 6, borderLeftColor: '#F59E0B' },

  statusChildName: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  statusSubText: { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  makeupBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  makeupText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  
  statusBtnGroup: { flexDirection: 'row', gap: 5 },
  statusSmallBtn: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', minWidth: 45, alignItems: 'center' },
  statusSmallBtnText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  
  active등원: { backgroundColor: '#6366F1' },
  active하원: { backgroundColor: '#10B981' },
  active결석: { backgroundColor: '#EF4444' },
  active보강: { backgroundColor: '#F59E0B' },
  textWhite: { color: '#FFF' },

  cancelWaitBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 10, borderWidth: 1, borderColor: '#F59E0B' },
  cancelWaitText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' },
  approveCancelBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  approveCancelBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  emptyStatusBox: { padding: 20, backgroundColor: '#F8FAFC', borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  emptyStatusText: { color: '#CBD5E1', fontSize: 13 },

  weekBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#FFF' },
  dayCard: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  activeDayCard: { backgroundColor: '#1E1B4B' },
  dayText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  activeDayText: { color: '#FFF' },
  
  listContent: { padding: 20 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 18, borderRadius: 20, marginBottom: 12, alignItems: 'center', elevation: 3 },
  cardTimeBox: { width: 50, alignItems: 'center' },
  cardTime: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  timeLine: { width: 2, height: 10, backgroundColor: '#E2E8F0', marginVertical: 3 },
  cardTimeEnd: { fontSize: 12, color: '#94A3B8' },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardClassName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardDetail: { fontSize: 12, color: '#64748B', marginTop: 2 },

  fab: { position: 'absolute', bottom: 30, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 15 },
  input: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, fontSize: 15, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  row: { flexDirection: 'row' },
  submitBtn: { backgroundColor: '#1E1B4B', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30, marginBottom: 30 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});