import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function GalleryDetailScreen({ route, navigation }: any) {
  const { post } = route.params; // List에서 넘어온 사진 데이터

  // 🗑️ 삭제 함수
  const handleDelete = async () => {
    Alert.alert("삭제 확인", "이 게시물을 삭제하시겠습니까?", [
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
      {/* 🚀 헤더 섹션: 뒤로가기, 타이틀, 수정/삭제 버튼 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>게시물 보기</Text>

        <View style={styles.headerRight}>
          {/* ✏️ 수정 버튼 */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('GalleryEdit', { post: post })}
            style={styles.headerIconBtn}
          >
            <Ionicons name="create-outline" size={24} color="#4B5563" />
          </TouchableOpacity>

          {/* 🗑️ 삭제 버튼 */}
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* 1️⃣ 상단: 제목과 날짜 영역 */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.date}>{new Date(post.created_at).toLocaleDateString()}</Text>
        </View>

        {/* 2️⃣ 중단: 메인 이미지 */}
        <Image 
          source={{ uri: post.image_url }} 
          style={styles.mainImage} 
          resizeMode="contain" 
        />

        {/* 3️⃣ 하단: 상세 내용 영역 (content) */}
        <View style={styles.infoSection}>
          <View style={styles.descriptionBox}>
            {post.content ? (
              <Text style={styles.description}>{post.content}</Text>
            ) : (
              <Text style={styles.emptyDescription}>상세 내용이 작성되지 않았습니다.</Text>
            )}
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800',
    color: '#111827'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerIconBtn: {
    marginRight: 15
  },
  
  // 제목 영역 스타일
  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1E293B', 
    marginBottom: 8 
  },
  date: { 
    fontSize: 14, 
    color: '#94A3B8', 
  },

  // 이미지 영역 스타일
  mainImage: { 
    width: '100%', 
    height: 400, 
    backgroundColor: '#F8FAFC' 
  },

  // 내용 영역 스타일
  infoSection: { 
    padding: 24 
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  description: { 
    fontSize: 16, 
    color: '#334155', 
    lineHeight: 26 
  },
  emptyDescription: {
    fontSize: 15,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10
  }
});