import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function PickupApplyScreen({ navigation }: any) {
  const [area, setArea] = useState('');      
  const [detailLocation, setDetailLocation] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 💡 새롭게 추가된 상태 관리 (정류장 목록 DB 연동)
  const [spots, setSpots] = useState<any[]>([]); // DB에서 불러온 목록
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<any>(null); // 선택된 정류장 객체 {id, name}
  const [showSpotDropdown, setShowSpotDropdown] = useState(false); // 드롭다운 열림/닫힘

  const TEST_CHILD_ID = "550e8400-e29b-41d4-a716-446655440000"; 

  // 💡 컴포넌트가 켜질 때 DB에서 정류장 목록을 가져옵니다.
  useEffect(() => {
    const fetchSpots = async () => {
      setLoadingSpots(true);
      const { data, error } = await supabase
        .from('pickup_spots')
        .select('id, name');
      
      if (!error && data) {
        setSpots(data);
      }
      setLoadingSpots(false);
    };
    fetchSpots();
  }, []);

  const handleSave = async () => {
    // 유효성 검사 (아파트 텍스트 대신 selectedSpot 객체가 있는지 확인)
    if (!area || !selectedSpot || !detailLocation) {
      Alert.alert("알림", "모든 정보를 입력해야 기사님이 찾으실 수 있어요!");
      return;
    }

    try {
      setIsSubmitting(true);

      // 💡 저장 로직: 단순 텍스트가 아닌 '정류장 ID'를 저장합니다.
      const { error } = await supabase
        .from('pickup_settings')
        .upsert({
          child_id: TEST_CHILD_ID, 
          area: area,              
          pickup_spot_id: selectedSpot.id,   // 👈 핵심! 객관식 고유 ID 저장
          apartment_name: selectedSpot.name, // 👈 이름도 같이 저장해두면 나중에 편함
          detail_location: detailLocation, 
          is_active: true,         
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
              공식 셔틀 정류장을 선택하고 상세 위치를 적어주세요.
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

          {/* 💡 수정된 부분: 아파트명 드롭다운 선택 */}
          <View style={styles.section}>
            <Text style={styles.label}>아파트명 / 정류장 (선택)</Text>
            
            <TouchableOpacity 
              style={styles.dropdownSelector}
              onPress={() => setShowSpotDropdown(!showSpotDropdown)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="business-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <Text style={[styles.dropdownText, !selectedSpot && { color: '#94A3B8' }]}>
                  {loadingSpots ? "정류장 목록 불러오는 중..." : (selectedSpot ? selectedSpot.name : "목록에서 정류장을 선택해주세요")}
                </Text>
              </View>
              <Ionicons name={showSpotDropdown ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* 드롭다운 리스트 */}
            {showSpotDropdown && (
              <View style={styles.dropdownListContainer}>
                {spots.length === 0 && !loadingSpots ? (
                  <Text style={styles.dropdownEmptyText}>등록된 정류장이 없습니다.</Text>
                ) : (
                  spots.map((spot) => (
                    <TouchableOpacity 
                      key={spot.id} 
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedSpot(spot);
                        setShowSpotDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{spot.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          {/* 상세 위치 입력 (주관식) */}
          <View style={styles.section}>
            <Text style={styles.label}>상세 탑승 위치 (직접 입력)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                placeholder="예: 101동 필로티 벤치 앞"
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
            style={[styles.saveBtn, (!area || !selectedSpot || !detailLocation) && styles.disabledBtn]} 
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
  topInfoSub: { fontSize: 15, color: '#64748B', lineHeight: 22 },
  section: { marginBottom: 32 },
  label: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 10, marginBottom: 10 },
  activeChip: { backgroundColor: '#6366F1' },
  chipText: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  activeChipText: { color: '#FFFFFF' },
  
  // 드롭다운 관련 스타일
  dropdownSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  dropdownText: { fontSize: 15, color: '#1E293B', fontWeight: '600', flex: 1 },
  dropdownListContainer: { marginTop: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  dropdownEmptyText: { padding: 16, color: '#94A3B8', textAlign: 'center' },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 15, color: '#1E293B', fontWeight: '600' },
  
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  saveBtn: { backgroundColor: '#6366F1', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#CBD5E1' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }
});