import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const POPUP_WIDTH = width * 0.85;

interface Notice {
  id: string;
  title: string;
  content: string;
  image_url: string;
}

interface NoticePopupProps {
  isVisible: boolean;
  notices: Notice[]; // 💡 여러 개의 공지 데이터를 받음
  onClose: () => void;
}

export default function NoticePopup({ isVisible, notices, onClose }: NoticePopupProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleHideForToday = async () => {
    const expiryDate = new Date().getTime() + 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem('hide_notice_until', expiryDate.toString());
    onClose();
  };

  // 렌더링할 공지 아이템
  const renderItem = ({ item }: { item: Notice }) => (
    <View style={{ width: POPUP_WIDTH }}>
      <Image source={{ uri: item.image_url }} style={styles.noticeImage} />
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.content}</Text>
      </View>
    </View>
  );

  if (notices.length === 0) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { width: POPUP_WIDTH }]}>
          
          <FlatList
            data={notices}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / POPUP_WIDTH);
              setActiveIndex(index);
            }}
          />

          {/* 페이지 인디케이터 (점) */}
          {notices.length > 1 && (
            <View style={styles.indicatorRow}>
              {notices.map((_, i) => (
                <View key={i} style={[styles.dot, activeIndex === i && styles.activeDot]} />
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerBtn} onPress={handleHideForToday}>
              <Text style={styles.footerText}>오늘 하루 보지 않기</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
              <Text style={[styles.footerText, { color: '#111827', fontWeight: 'bold' }]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden' },
  noticeImage: { width: '100%', height: 250, backgroundColor: '#F3F4F6' },
  content: { padding: 20, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  description: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  indicatorRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', marginHorizontal: 3 },
  activeDot: { backgroundColor: '#4F46E5', width: 12 },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', height: 50 },
  footerBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 13, color: '#9CA3AF' },
  divider: { width: 1, backgroundColor: '#F3F4F6' }
});