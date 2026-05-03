import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // 👈 수퍼베이스 연동 필수!

export default function DriverDashboardScreen({ navigation }: any) {
  const [isDriving, setIsDriving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickupGroups, setPickupGroups] = useState<any[]>([]);

  // 💡 화면이 켜지면 무조건 DB에서 데이터를 불러옵니다.
  useEffect(() => {
    fetchTodayPickups();
  }, []);

  const fetchTodayPickups = async () => {
    setLoading(true);
    try {
      // 1. pickup_settings에서 데이터 가져오기 (정류장 정보 조인)
      // 🚨 수정완료: pickup_settings 테이블에 없는 id 컬럼을 select에서 제거했습니다.
      const { data, error } = await supabase
        .from('pickup_settings')
        .select(`
          detail_location,
          child_id,
          pickup_spots ( id, name )
        `)
        .eq('is_active', true);

      if (error) throw error;

      // 2. 가져온 데이터를 "정류장(Spot) 기준"으로 예쁘게 묶어줍니다 (Grouping)
      if (data) {
        const grouped = data.reduce((acc: any, curr: any) => {
          const spotId = curr.pickup_spots?.id || 'unknown';
          const spotName = curr.pickup_spots?.name || '지정되지 않은 정류장';
          
          if (!acc[spotId]) {
            acc[spotId] = {
              id: spotId,
              classTime: '오후 수업', // 💡 임시 (나중에 예약 테이블의 시간 사용)
              spotName: spotName,
              arrivalTime: '--:--', // 💡 임시
              students: []
            };
          }
          
          acc[spotId].students.push({
            setting_id: curr.child_id, // 🚨 수정완료: curr.id 대신 curr.child_id를 사용
            child_id: curr.child_id,
            name: '학생(DB연동필요)', // 💡 나중에 children 테이블 조인해서 이름 가져오기
            detail: curr.detail_location,
            status: 'pending' // 초기 상태는 무조건 '대기중'
          });
          
          return acc;
        }, {});

        // Object를 Array로 변환해서 State에 저장
        setPickupGroups(Object.values(grouped));
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
      Alert.alert("오류", "탑승 명단을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 💡 운행 시작/종료 토글
  const toggleDrivingStatus = () => {
    setIsDriving(!isDriving);
    if (!isDriving) {
      Alert.alert("운행 시작", "위치 전송이 시작되었습니다.\n안전 운행하세요!");
      // TODO: supabase shuttle_status 테이블에 is_driving = true 업데이트
    } else {
      Alert.alert("운행 종료", "운행이 종료되었습니다.");
    }
  };

  // 💡 개별 탑승 처리 (안전장치 적용!)
  const handleStudentBoarding = (groupId: string, studentId: string, currentStatus: string) => {
    // 🚨 팀장님 아이디어 적용: 운행 중이 아니면 버튼 안 눌림!
    if (!isDriving) {
      Alert.alert("알림", "운행 시작 스위치를 먼저 켜주세요!");
      return;
    }

    const newStatus = currentStatus === 'pending' ? 'boarded' : 'pending';

    // UI 즉시 업데이트 (빠른 반응성을 위해)
    setPickupGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            students: group.students.map((stu: any) => 
              stu.child_id === studentId ? { ...stu, status: newStatus } : stu
            )
          };
        }
        return group;
      })
    );

    // TODO: 실제로 Supabase의 승하차 기록 테이블(attendance_logs 등)에 탑승 시간 업데이트 로직 추가
  };

  // 💡 일괄 탑승 처리
  const handleBatchBoarding = (groupId: string) => {
    if (!isDriving) {
      Alert.alert("알림", "운행 시작 스위치를 먼저 켜주세요!");
      return;
    }

    setPickupGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            students: group.students.map((stu: any) => ({ ...stu, status: 'boarded' }))
          };
        }
        return group;
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>기사님 대시보드</Text>
        </View>
        <MaterialCommunityIcons name="steering" size={28} color="#FFF" />
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.statusInfo}>
          <View style={[styles.statusIndicator, isDriving ? styles.activeIndicator : styles.inactiveIndicator]} />
          <Text style={styles.statusText}>
            {isDriving ? '현재 운행 중 (위치 전송 중)' : '운행 대기 (위치 전송 꺼짐)'}
          </Text>
        </View>
        <Switch 
          value={isDriving}
          onValueChange={toggleDrivingStatus}
          trackColor={{ false: '#CBD5E1', true: '#10B981' }}
          thumbColor={'#FFFFFF'}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!isDriving && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            <Text style={styles.warningText}>운행을 시작해야 부모님 앱에 실시간 위치가 표시됩니다.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>오늘의 픽업 명단</Text>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={{ marginTop: 10, color: '#64748B' }}>명단을 불러오는 중입니다...</Text>
          </View>
        ) : pickupGroups.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="bus-outline" size={48} color="#CBD5E1" />
            <Text style={{ marginTop: 10, color: '#64748B', fontSize: 16 }}>오늘은 탑승 예정인 학생이 없습니다.</Text>
          </View>
        ) : (
          pickupGroups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View>
                  <Text style={styles.classTimeText}>{group.classTime} 등원 셔틀</Text>
                  <Text style={styles.spotNameText}>📍 {group.spotName}</Text>
                </View>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>{group.arrivalTime}</Text>
                </View>
              </View>

              <View style={styles.studentList}>
                {group.students.map((student: any) => (
                  <View key={student.child_id} style={styles.studentRow}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentDetail}>{student.detail}</Text>
                    </View>
                    
                    {/* 💡 개별 탑승 버튼 */}
                    <TouchableOpacity 
                      style={[
                        styles.statusBtn, 
                        student.status === 'boarded' ? styles.boardedBtn : styles.pendingBtn,
                        !isDriving && { opacity: 0.6 } // 운행 안할 땐 약간 투명하게
                      ]}
                      onPress={() => handleStudentBoarding(group.id, student.child_id, student.status)}
                    >
                      <Text style={[
                        styles.statusBtnText, 
                        student.status === 'boarded' && styles.boardedBtnText
                      ]}>
                        {student.status === 'boarded' ? '탑승 완료' : '대기중'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              
              {/* 💡 일괄 탑승 버튼 */}
              <TouchableOpacity 
                style={styles.batchBtn}
                onPress={() => handleBatchBoarding(group.id)}
              >
                <Text style={styles.batchBtnText}>이 정류장 모두 탑승 처리</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#1E293B' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginLeft: 15 },
  controlPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 2 },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  activeIndicator: { backgroundColor: '#10B981' },
  inactiveIndicator: { backgroundColor: '#94A3B8' },
  statusText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  scrollContent: { padding: 16 },
  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, marginBottom: 20 },
  warningText: { marginLeft: 10, color: '#B45309', fontWeight: '600', fontSize: 14, flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 4 },
  groupCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 20, overflow: 'hidden', elevation: 1 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#F8FAFC', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  classTimeText: { fontSize: 13, fontWeight: '700', color: '#6366F1', marginBottom: 4 },
  spotNameText: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  timeBadge: { backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timeBadgeText: { color: '#4F46E5', fontWeight: '800', fontSize: 14 },
  studentList: { padding: 16 },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  studentDetail: { fontSize: 13, color: '#64748B' },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  pendingBtn: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' },
  boardedBtn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  statusBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  boardedBtnText: { color: '#FFFFFF' },
  batchBtn: { backgroundColor: '#F1F5F9', paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  batchBtnText: { color: '#64748B', fontSize: 14, fontWeight: '700' }
});