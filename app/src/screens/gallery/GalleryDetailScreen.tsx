import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function GalleryDetailScreen({ route, navigation }: any) {
  const { post } = route.params; // List에서 넘어온 사진 데이터

  // 삭제 함수
  const handleDelete = async () => {
    Alert.alert("삭제 확인", "이 사진을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { 
        text: "삭제", 
        style: "destructive", 
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('gallery_posts')
              .delete()
              .eq('id', post.id);
            
            if (error) throw error;
            Alert.alert("성공", "삭제되었습니다.");
            navigation.goBack();
          } catch (e) {
            Alert.alert("오류", "삭제에 실패했습니다.");
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상세보기</Text>
        {/* 관리자(코치)일 때만 삭제 버튼 노출 (임시로 항상 노출) */}
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <Image source={{ uri: post.image_url }} style={styles.mainImage} resizeMode="contain" />
        <View style={styles.infoSection}>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.date}>{new Date(post.created_at).toLocaleDateString()}</Text>
          <View style={styles.divider} />
          <Text style={styles.description}>
            {/* 나중에 상세 설명 컬럼을 추가하면 여기에 표시합니다 */}
            우리 아이들의 즐거운 활동 모습입니다! 😊
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  mainImage: { width: '100%', height: 400, backgroundColor: '#000' },
  infoSection: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  date: { fontSize: 14, color: '#94A3B8', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  description: { fontSize: 16, color: '#475569', lineHeight: 24 }
});