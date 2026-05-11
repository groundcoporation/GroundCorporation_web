import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, StatusBar, ActivityIndicator, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function AdminMemberScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  // 🚀 DB 데이터 로드 로직
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, 
          name, 
          phone, 
          role,
          target_class,
          children (
            id, 
            child_name, 
            target_class
          ),
          user_packages!fk_user_packages_user (
            id, 
            package_name, 
            remaining_count, 
            total_count
          )
        `)
        // .eq('role', 'user') // 👈 관리자도 보기 위해 주석 처리 유지
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (e: any) {
      console.error("로드 에러:", e.message);
      Alert.alert("오류", "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터
  const filteredMembers = members.filter(m => 
    m.name.includes(searchQuery) || 
    (m.children && m.children.some((c: any) => c.child_name.includes(searchQuery))) ||
    m.phone.includes(searchQuery)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원 및 수강권 관리</Text>
        <TouchableOpacity onPress={fetchMembers} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* 검색 바 */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="이름 또는 전화번호 검색"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>데이터 로딩 중...</Text>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listCount}>전체 회원 {filteredMembers.length}명</Text>
            </View>

            {filteredMembers.map((member) => {
              // 자녀 데이터 유무에 따른 표시 로직
              const displayChildren = member.children && member.children.length > 0 
                ? member.children 
                : [{ id: `self_${member.id}`, child_name: member.name, target_class: member.target_class, isAdult: true }];

              return (
                <TouchableOpacity 
                  key={member.id} 
                  style={styles.memberCard}
                  onPress={() => navigation.navigate("AdminMemberDetail", { userId: member.id })}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.leftInfo}>
                      <View style={styles.parentRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.parentNameText}>
                            {member.name} {displayChildren[0].isAdult ? '회원' : '학부모'}님
                          </Text>
                          {/* 🚀 관리자 배지 표시 */}
                          {member.role === 'admin' && (
                            <View style={styles.adminBadge}>
                              <Text style={styles.adminBadgeText}>관리자</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.phoneText}>{member.phone}</Text>
                      </View>

                      <View style={styles.childList}>
                        {displayChildren.map((child: any) => (
                          <View key={child.id} style={styles.childBriefCard}>
                            <View style={styles.childNameSection}>
                              <Text style={styles.childNameText}>
                                • {child.child_name}{child.isAdult ? ' (본인)' : ''}
                              </Text>
                              <View style={styles.miniBadge}>
                                <Text style={styles.miniBadgeText}>{child.target_class || '반 미지정'}</Text>
                              </View>
                            </View>
                            
                            {/* 수강권 요약 표시 */}
                            {member.user_packages && member.user_packages.length > 0 ? (
                              <View style={styles.miniPackageInfo}>
                                <Text style={styles.miniPackageName}>
                                  {member.user_packages[0].package_name || '수강권'}
                                </Text>
                                <Text style={styles.miniPackageCount}>
                                  {member.user_packages[0].remaining_count}/{member.user_packages[0].total_count}회
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.noPackageMini}>수강권 없음</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  refreshBtn: { padding: 5 },
  
  searchSection: { 
    padding: 20, backgroundColor: '#FFF', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, 
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 
  },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 16 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '500', color: '#1E293B' },

  scrollContent: { padding: 20 },
  loadingBox: { marginTop: 100, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#94A3B8', fontWeight: '600' },

  listHeader: { marginBottom: 15, paddingLeft: 5 },
  listCount: { fontSize: 14, fontWeight: '700', color: '#64748B' },

  memberCard: { 
    backgroundColor: '#FFF', padding: 20, borderRadius: 28, marginBottom: 16, 
    borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10 
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  leftInfo: { flex: 1 },
  
  parentRow: { marginBottom: 12 },
  parentNameText: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  phoneText: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '500' },

  // 관리자 배지 스타일
  adminBadge: { backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  adminBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  childList: { marginTop: 4 },
  childBriefCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 14, marginBottom: 6 },
  childNameSection: { flexDirection: 'row', alignItems: 'center' },
  childNameText: { fontSize: 14, fontWeight: '700', color: '#334155', marginRight: 6 },
  miniBadge: { backgroundColor: '#FFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  miniBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748B' },

  miniPackageInfo: { alignItems: 'flex-end' },
  miniPackageName: { fontSize: 10, color: '#6366F1', fontWeight: '700' },
  miniPackageCount: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
  noPackageMini: { fontSize: 11, color: '#CBD5E1', fontWeight: '600' }
});