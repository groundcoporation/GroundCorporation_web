import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ReservationSuccessScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={80} color="#4F46E5" />
        </View>
        
        <Text style={styles.title}>결제가 완료되었습니다! 🎉</Text>
        <Text style={styles.subtitle}>
          정상적으로 처리가 완료되었습니다.{"\n"}
          이제 수업 예약 메뉴에서 시간표를 선택해주세요.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>결제 및 예약 정보는 마이페이지에서 확인 가능합니다.</Text>
        </View>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => navigation.replace('Home')} // 플러터의 pushAndRemoveUntil 로직
        >
          <Text style={styles.primaryButtonText}>확인 후 홈으로 이동</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.navigate('Schedule')} // 예약 달력으로 바로 가기
        >
          <Text style={styles.secondaryButtonText}>바로 수업 예약하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  iconCircle: { 
    width: 140, height: 140, borderRadius: 70, 
    backgroundColor: '#EEF2FF', justifyContent: 'center', 
    alignItems: 'center', marginBottom: 30 
  },
  title: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 15, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  infoBox: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, width: '100%' },
  infoText: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },
  buttonGroup: { padding: 20, gap: 12, marginBottom: Platform.OS === 'ios' ? 20 : 10 },
  primaryButton: { backgroundColor: '#111827', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { paddingVertical: 15, alignItems: 'center' },
  secondaryButtonText: { color: '#6366F1', fontSize: 15, fontWeight: '700' }
});