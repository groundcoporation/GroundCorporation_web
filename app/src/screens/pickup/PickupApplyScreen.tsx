import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // 👈 경로 확인 필수!

export default function PickupApplyScreen({ navigation }: any) {
  // 1. 입력 상태 관리
  const [area, setArea] = useState('');      
  const [apartment, setApartment] = useState(''); 
  const [detailLocation, setDetailLocation] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false); // 저장 중 로딩 상태

  // 💡 테스트용 아이 UUID (실제로는 로그인된 사용자 정보를 가져와야 함)
  const TEST_CHILD_ID = "550e8400-e29b-41d4-a716-446655440000"; 

  // 2. DB 저장 함수 (upsert 사용)
  const handleSave = async () => {
    if (!area || !apartment || !detailLocation) {
      Alert.alert("알림", "모든 정보를 입력해야 기사님이 찾으실 수 있어요!");
      return;
    }

    try {
      setIsSubmitting(true);

      // 💾 supabase의 pickup_settings 테이블에 데이터 저장/수정
      const { error } = await supabase
        .from('pickup_settings')
        .upsert({
          child_id: TEST_CHILD_ID, // 아이 ID
          area: area,              // 선택한 지역
          apartment: apartment,    // 입력한 아파트명
          detail_location: detailLocation, // 상세 위치
          is_active: true,         // 정보 등록 시 활성화로 간주
          updated_at: new Date(),
        });

      if (error) throw error;

      Alert.alert(
        "등록 완료", 
        "픽업 정보가 안전하게 저장되었습니다.",
        [{ text: "확인", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('저장 실패:', error.message);
      Alert.alert("에러", "정보 저장 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>픽업 정보 설정</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topInfo}>
            <Text style={styles.topInfoTitle}>📍 어디서 탑승하나요?</Text>
            <Text style={styles.topInfoSub}>
              거주하시는 아파트와 상세 위치를 적어주세요.
            </Text>
          </View>

          {/* 지역 선택 */}
          <View style={styles.section}>
            <Text style={styles.label}>지역 선택</Text>
            <View style={styles.chipGroup}>
              {['배곧동', '정왕동', '월곶동', '기타'].map((item) => (
                <TouchableOpacity 
                  key={item} 
                  style={[styles.chip, area === item && styles.activeChip]}
                  onPress={() => setArea(item)}
                >
                  <Text style={[styles.chipText, area === item && styles.activeChipText]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 아파트명 입력 */}
          <View style={styles.section}>
            <Text style={styles.label}>아파트명 / 단지명</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                placeholder="예: 배곧 한신더휴"
                value={apartment}
                onChangeText={setApartment}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* 상세 위치 입력 */}
          <View style={styles.section}>
            <Text style={styles.label}>상세 탑승 위치</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                placeholder="예: 101동 정문 앞"
                value={detailLocation}
                onChangeText={setDetailLocation}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        </ScrollView>

        {/* 하단 저장 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveBtn, (!area || !apartment || !detailLocation) && styles.disabledBtn]} 
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>픽업 정보 저장하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  scrollContent: { padding: 24 },
  topInfo: { marginBottom: 30 },
  topInfoTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  topInfoSub: { fontSize: 15, color: '#64748B' },
  section: { marginBottom: 32 },
  label: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 10, marginBottom: 10 },
  activeChip: { backgroundColor: '#6366F1' },
  chipText: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  activeChipText: { color: '#FFFFFF' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 15, color: '#1E293B', fontWeight: '600' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  saveBtn: { backgroundColor: '#6366F1', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#CBD5E1' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }
});