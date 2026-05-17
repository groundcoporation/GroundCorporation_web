import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Picker } from "@react-native-picker/picker"; // 🚀 관리자 지점 필터용

// 🚀 [완벽 적용됨] 권한 스위치 및 소속 지점 확인을 위해 useAuth 임포트
import { useAuth } from "../../context/AuthContext";

export default function GalleryListScreen({ navigation }: any) {
  // 🚀 [리팩토링 완료] 전역 권한 스위치(isAdmin, isStaff) 및 지점 정보 호출
  const { branchId, isAdmin, isStaff } = useAuth();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 [추가] 관리자용 지점 필터 상태
  const [selectedFilterBranch, setSelectedFilterBranch] = useState<string>("all");
  const [branches, setBranches] = useState<any[]>([]);

  // 🚀 [적용] 관리자(isAdmin)일 때만 지점 목록 불러오기
  useEffect(() => {
    if (isAdmin) {
      fetchBranches();
    }
  }, [isAdmin]);

  const fetchBranches = async () => {
    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .order("display_order", { ascending: true });
      if (data) setBranches(data);
    } catch (e) {
      console.error("지점 목록 로드 실패:", e);
    }
  };

  // 화면이 켜지거나, 업로드하고 돌아왔을 때 목록을 다시 불러옵니다.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchGalleryPosts();
    });
    // 🚀 지점 필터나 소속 지점이 바뀔 때도 즉시 새로고침
    fetchGalleryPosts();
    return unsubscribe;
  }, [navigation, branchId, selectedFilterBranch]);

  const fetchGalleryPosts = async () => {
    setLoading(true);
    try {
      // 🚀 [핵심 수정] 권한 및 필터에 따른 쿼리 동적 생성
      let query = supabase.from('gallery_posts').select('*');

      // 💡 [적용] role === "admin" 대신 isAdmin 스위치 사용!
      if (isAdmin) {
        // 관리자: 필터가 'all'이 아니면 해당 지점만, 'all'이면 전체 조회
        if (selectedFilterBranch !== "all") {
          query = query.eq("branch_id", selectedFilterBranch);
        }
      } else {
        // 코치/학부모: 본인 지점 데이터이거나 전체공유(null)인 사진만 가져옴
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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
        <Text style={styles.title} numberOfLines={1}>
          {/* 🚀 전체 공용 사진일 경우 머리말 표시 (isAdmin 스위치 적용) */}
          {item.branch_id === null && isAdmin ? "[전체] " : ""}
          {item.title}
        </Text>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>활동 갤러리</Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* 🚀 [적용] 관리자(isAdmin)일 때만 보이는 지점 필터 드롭다운 */}
          {isAdmin && (
            <View style={styles.filterContainer}>
              <Picker
                selectedValue={selectedFilterBranch}
                onValueChange={(itemValue) => setSelectedFilterBranch(itemValue)}
                style={styles.picker}
                dropdownIconColor="#4F46E5"
              >
                <Picker.Item label="전체 보기" value="all" style={{ fontSize: 13 }} />
                {branches.map((b) => (
                  <Picker.Item key={b.id} label={b.name} value={b.id} style={{ fontSize: 13 }} />
                ))}
              </Picker>
            </View>
          )}

          {/* 💡 바로 이 버튼을 누르면 아까 만든 업로드 화면으로 넘어갑니다! */}
          {/* 🚀 [적용] 직원(isStaff)일 때만 업로드 버튼이 보입니다. 일반 학부모는 숨김 처리 */}
          {isStaff ? (
            <TouchableOpacity 
              onPress={() => navigation.navigate('GalleryUpload')}
              style={{ marginLeft: 12 }}
            >
              <Ionicons name="add-circle-outline" size={28} color="#4F46E5" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28, marginLeft: 12 }} />
          )}
        </View>
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
  
  // 🚀 헤더 레이아웃 수정 (필터와 버튼을 나란히 배치하기 위함)
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginLeft: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  
  /* 🚀 추가된 필터 스타일 */
  filterContainer: {
    width: 120,
    height: 36,
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    color: "#4F46E5",
  },

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