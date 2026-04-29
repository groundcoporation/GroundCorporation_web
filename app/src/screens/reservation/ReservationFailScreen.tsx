import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ReservationFailScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      {/* 1. 실패 메시지 영역 (플러터의 Center + Column 구조 이식) */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="warning" size={80} color="#EF4444" />
        </View>
        
        <Text style={styles.title}>결제에 실패했습니다</Text>
        <Text style={styles.subtitle}>
          시스템 오류 또는 결제 정보 오류일 수 있습니다.{"\n"}
          다시 시도하거나 지점으로 문의해 주세요.
        </Text>

        <View style={styles.errorDetailBox}>
          <Text style={styles.errorDetailText}>네트워크 연결 상태나 카드 한도를 확인해주세요.</Text>
        </View>
      </View>

      {/* 2. 하단 버튼 영역 (플러터의 ElevatedButton 로직 반영) */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => navigation.goBack()} // 다시 이용권 선택으로
        >
          <Text style={styles.retryButtonText}>다시 시도하기</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.homeButton} 
          onPress={() => navigation.replace('Home')} // 플러터의 pushAndRemoveUntil과 동일 효과
        >
          <Text style={styles.homeButtonText}>확인 후 홈으로 이동</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF' 
  },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 30 
  },
  // 하이엔드 감성을 위해 배경에 아주 연한 빨간색 원 배치
  iconCircle: { 
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    backgroundColor: '#FEF2F2', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 30 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#111827', 
    marginBottom: 15,
    letterSpacing: -0.5
  },
  subtitle: { 
    fontSize: 16, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 24, 
    marginBottom: 40 
  },
  errorDetailBox: { 
    backgroundColor: '#F9FAFB', 
    padding: 15, 
    borderRadius: 12, 
    width: '100%' 
  },
  errorDetailText: { 
    color: '#94A3B8', 
    fontSize: 13, 
    textAlign: 'center' 
  },
  buttonGroup: { 
    padding: 20, 
    gap: 12,
    marginBottom: Platform.OS === 'ios' ? 20 : 10 
  },
  // 다시 시도 버튼 (강조)
  retryButton: { 
    backgroundColor: '#EF4444', 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  retryButtonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  // 홈으로 이동 버튼 (보조)
  homeButton: { 
    backgroundColor: '#F3F4F6',
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  homeButtonText: { 
    color: '#4B5563', 
    fontSize: 16, 
    fontWeight: '700' 
  }
});