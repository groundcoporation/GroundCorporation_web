import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { sendGlobalPushNotification } from '../../services/notificationService'; 
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function DriverDashboardScreen({ navigation }: any) {
  const [isDriving, setIsDriving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickupGroups, setPickupGroups] = useState<any[]>([]);

  useEffect(() => {
    fetchTodayPickups();

    const channel = supabase
      .channel('realtime:pickup_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_settings' }, () => {
        fetchTodayPickups(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTodayPickups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pickup_settings')
        .select(`
          detail_location,
          child_id,
          pickup_spots ( id, name ),
          children ( child_name, parent_id )
        `)
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        const grouped = data.reduce((acc: any, curr: any) => {
          const spotId = curr.pickup_spots?.id || 'unknown';
          const spotName = curr.pickup_spots?.name || '지정되지 않은 정류장';
          
          if (!acc[spotId]) {
            acc[spotId] = { id: spotId, spotName: spotName, students: [] };
          }
          
          acc[spotId].students.push({
            child_id: curr.child_id,
            parent_id: curr.children?.parent_id,
            name: curr.children?.child_name || '이름 확인 필요',
            detail: curr.detail_location,
            status: 'pending'
          });
          
          return acc;
        }, {});

        setPickupGroups(Object.values(grouped));
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
      Alert.alert("오류", "명단을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDrivingStatus = () => {
    setIsDriving(!isDriving);
    Alert.alert(isDriving ? "운행 종료" : "운행 시작", isDriving ? "운행이 종료되었습니다." : "위치 전송이 시작되었습니다.");
  };

  const handleStudentBoarding = async (groupId: string, student: any, status: string) => {
    if (!isDriving) {
      Alert.alert("알림", "운행 시작 스위치를 먼저 켜주세요!");
      return;
    }

    if (status === 'dropped_off') return;

    const nextStatus = status === 'pending' ? 'boarded' : 'dropped_off';
    const eventType = nextStatus === 'boarded' ? '승차' : '하차';
    
    // 💡 한국 시간(Asia/Seoul)으로 시간 생성
    const nowKST = dayjs().tz("Asia/Seoul").toISOString();

    setPickupGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            students: group.students.map((stu: any) => 
              stu.child_id === student.child_id ? { ...stu, status: nextStatus } : stu
            )
          };
        }
        return group;
      })
    );

    try {
      // 🚀 shuttle_logs 테이블에만 기록
      const { error } = await supabase
        .from('shuttle_logs')
        .insert([{
          child_id: student.child_id,
          event_type: eventType,
          event_time: nowKST
        }]);

      if (error) throw error;

      // 🔔 알림 발송
      if (student.parent_id) {
        await sendGlobalPushNotification({
          targetBranchId: null,
          targetUserId: student.parent_id,
          title: `🚐 셔틀버스 운행 안내`,
          body: `${student.name} 학생이 셔틀버스에 [${eventType} 완료] 하였습니다.`,
          type: "attendance",
          relatedId: student.child_id
        });
      }
      
      console.log(`✅ [성공] ${eventType} 기록 및 알림 완료 (KST: ${nowKST})`);
    } catch (err) {
      console.error("❌ 로그 저장 실패:", err);
      Alert.alert("오류", "기록 저장에 실패했습니다.");
    }
  };

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
            students: group.students.map((stu: any) => 
              stu.status === 'pending' ? { ...stu, status: 'boarded' } : stu
            )
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
          <Text style={styles.statusText}>{isDriving ? '운행 중' : '운행 대기'}</Text>
        </View>
        <Switch value={isDriving} onValueChange={toggleDrivingStatus} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {pickupGroups.map((group) => (
          <View key={group.id} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.spotNameText}>📍 {group.spotName}</Text>
            </View>
            <View style={styles.studentList}>
              {group.students.map((student: any) => (
                <View key={student.child_id} style={styles.studentRow}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <TouchableOpacity 
                    style={[styles.statusBtn, student.status === 'boarded' ? styles.boardedBtn : student.status === 'dropped_off' ? styles.droppedBtn : styles.pendingBtn]}
                    onPress={() => handleStudentBoarding(group.id, student, student.status)}
                  >
                    <Text style={styles.statusBtnText}>
                      {student.status === 'pending' ? '승차 처리' : student.status === 'boarded' ? '하차 처리' : '하차 완료'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#1E293B' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginLeft: 15 },
  controlPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  activeIndicator: { backgroundColor: '#10B981' },
  inactiveIndicator: { backgroundColor: '#94A3B8' },
  statusText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  scrollContent: { padding: 16 },
  groupCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 20, elevation: 1 },
  groupHeader: { padding: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  spotNameText: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  studentList: { padding: 16 },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  studentName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, minWidth: 90, alignItems: 'center' },
  pendingBtn: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' },
  boardedBtn: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  droppedBtn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  statusBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' }
});