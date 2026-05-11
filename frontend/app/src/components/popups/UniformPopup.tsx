import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

interface UniformPopupProps {
  isVisible: boolean;
  childId: string | null;
  targetClass: string | null;
  onComplete: () => void;
  onClose: () => void;
}

export default function UniformPopup({ isVisible, childId, targetClass, onComplete, onClose }: UniformPopupProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [backNumber, setBackNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const sizes = ['JS', 'JM', 'JL', 'S', 'M', 'L', 'XL'];

  const handleSave = async () => {
    if (!selectedSize || !backNumber) {
      Alert.alert('알림', '사이즈와 등번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1. 중복 체크
      const { data: duplicate } = await supabase
        .from('children')
        .select('id')
        .eq('target_class', targetClass)
        .eq('back_number', backNumber)
        .not('id', 'eq', childId)
        .maybeSingle();

      if (duplicate) {
        Alert.alert('중복 번호', '이미 다른 친구가 사용 중인 번호입니다.');
        setLoading(false);
        return;
      }

      // 2. DB 업데이트
      const { error } = await supabase
        .from('children')
        .update({ uniform_size: selectedSize, back_number: backNumber })
        .eq('id', childId);

      if (error) throw error;

      Alert.alert('완료', '신청이 완료되었습니다! 🎉');
      onComplete();
    } catch (e) {
      Alert.alert('오류', '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>👕 유니폼 신청</Text>
          <Text style={styles.subtitle}>아이의 사이즈와 원하는 등번호를 입력해주세요.</Text>

          <Text style={styles.sectionTitle}>1. 사이즈 선택</Text>
          <View style={styles.sizeGrid}>
            {sizes.map(size => (
              <TouchableOpacity key={size} style={[styles.sizeChip, selectedSize === size && styles.activeSizeChip]} onPress={() => setSelectedSize(size)}>
                <Text style={[styles.sizeText, selectedSize === size && styles.activeSizeText]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>2. 등번호 입력 (1~99)</Text>
          <TextInput style={styles.numberInput} placeholder="숫자 입력" keyboardType="number-pad" maxLength={2} value={backNumber} onChangeText={setBackNumber} />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>저장하기</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContainer: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  sizeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 8, marginBottom: 8 },
  activeSizeChip: { backgroundColor: '#1E1B4B' },
  sizeText: { fontSize: 14, color: '#64748B' },
  activeSizeText: { color: '#FFF' },
  numberInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 18, textAlign: 'center', marginBottom: 24 },
  submitBtn: { backgroundColor: '#6366F1', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});