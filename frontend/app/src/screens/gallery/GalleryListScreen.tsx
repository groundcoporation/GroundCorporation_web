import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function GalleryListScreen({ navigation }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 화면이 켜지거나, 업로드하고 돌아왔을 때 목록을 다시 불러옵니다.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchGalleryPosts();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchGalleryPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPosts(data);
    } catch (error) {
      console.error('갤러리 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 날짜 포맷 함수 (예: 2026. 05. 04)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`;
  };

  // 각각의 사진 카드 렌더링
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.cardContainer}
      onPress={() => navigation.navigate('GalleryDetail', { post: item })} // 나중에 상세 화면 연결!
    >
      <Image source={{ uri: item.image_url }} style={styles.image} />
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>활동 갤러리</Text>
        
        {/* 💡 바로 이 버튼을 누르면 아까 만든 업로드 화면으로 넘어갑니다! */}
        <TouchableOpacity onPress={() => navigation.navigate('GalleryUpload')}>
          <Ionicons name="add-circle-outline" size={28} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* 갤러리 리스트 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={60} color="#CBD5E1" />
          <Text style={styles.emptyText}>아직 등록된 사진이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2} // 💡 인스타그램 느낌 2열 그리드!
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, color: '#64748B' },
  
  listContent: { padding: 16 },
  row: { justifyContent: 'space-between', marginBottom: 16 },
  
  cardContainer: { 
    width: '48%', // 반반 나누기
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  image: { width: '100%', height: 160, backgroundColor: '#F8FAFC' },
  textContainer: { padding: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  date: { fontSize: 12, color: '#94A3B8' }
});