import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // 🚀 경로 수정 완료

export default function AdminConsultationScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetClasses, setTargetClasses] = useState<{ [key: string]: string }>({});

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 🚀 상담 요청과 유저 정보를 한 번에 가져옴 (아이디 추적)
      const { data, error } = await supabase
        .from('consultation_requests')
        .select(`
          *,
          user:users (
            name,
            phone,
            email
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      console.log(e);
      Alert.alert("에러", "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (requestId: string, userId: string) => {
    const assignedClass = targetClasses[userId];
    
    if (!assignedClass || assignedClass.trim() === '') {
      Alert.alert("알림", "배정할 반 이름을 입력해주세요.");
      return;
    }

    try {
      // 1. 유저 테이블의 target_class 업데이트 (결제 락 해제 핵심 로직)
      const { error: userError } = await supabase
        .from('users')
        .update({ target_class: assignedClass })
        .eq('id', userId);

      if (userError) throw userError;

      // 2. 상담 요청 상태를 COMPLETED로 변경
      const { error: requestError } = await supabase
        .from('consultation_requests')
        .update({ status: 'COMPLETED' })
        .eq('id', requestId);

      if (requestError) throw requestError;
      
      Alert.alert("완료", `${assignedClass}로 배정이 완료되었습니다.`);
      fetchRequests(); // 목록 새로고침
    } catch (e) {
      console.log(e);
      Alert.alert("에러", "처리에 실패했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>신규 상담 & 반 배정</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 50 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>대기 중인 상담 요청이 없습니다.</Text>
          </View>
        ) : (
          requests.map(req => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.userName}>{req.user?.name || '이름없음'} 학부모님</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{req.request_type}</Text>
                </View>
              </View>
              
              <Text style={styles.userPhone}>{req.user?.phone || '번호없음'}</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.label}>반 배정 (Target Class)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="예: 초등부 화/목 2시" 
                placeholderTextColor="#94A3B8"
                value={targetClasses[req.user_id] || ''}
                onChangeText={(txt) => setTargetClasses({...targetClasses, [req.user_id]: txt})}
              />
              
              <TouchableOpacity 
                style={styles.completeBtn} 
                onPress={() => handleComplete(req.id, req.user_id)}
              >
                <Text style={styles.completeBtnText}>상담 완료 및 배정 저장</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  scrollContent: { padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  typeBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },
  userPhone: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 12, borderRadius: 12, fontSize: 15, color: '#1E293B', marginBottom: 16 },
  completeBtn: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  completeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', fontSize: 15 }
});