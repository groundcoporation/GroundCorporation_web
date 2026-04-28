import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  StatusBar, 
  FlatList, 
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. 사용자 프로필 및 지점 정보 로드
        const { data: userProfile } = await supabase
          .from('users')
          .select('*, branches(name)')
          .eq('id', user.id)
          .single();
        setUserData(userProfile);

        // 2. 자녀 목록 로드
        const { data: childrenList } = await supabase
          .from('children')
          .select('*')
          .eq('parent_id', user.id)
          .order('created_at', { ascending: true });
        setChildren(childrenList || []);
      }
    } catch (e) {
      console.log('데이터 로드 에러:', e);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 💡 수업 카드 렌더링 함수
   * 성인일 경우 본인 이름을, 학부모일 경우 자녀 이름을 받아 처리합니다.
   */
  const renderLessonCard = (targetName: string, isChild: boolean) => (
    <View style={styles.cardInner}>
      {/* 관리자 이미지 자리 플레이스홀더 */}
      <View style={[styles.cardBg, { backgroundColor: '#444' }]} /> 
      <View style={styles.cardOverlay} />
      <View style={styles.cardContent}>
        <View>
          <Text style={styles.cardDateText}>05월 01일 (수) 14:00</Text>
          <Text style={styles.cardChildText}>
            {targetName} {isChild ? '학생' : '회원님'} ({userData?.branches?.name || '시흥본점'})
          </Text>
        </View>
        {/* 💡 픽업 버튼은 자녀(학생)일 때만 노출 */}
        {isChild && (
          <TouchableOpacity style={styles.pickupBtn}>
            <Text style={styles.pickupBtnText}>🚌 픽업 신청</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* AppBar (플러터 AppBar 구조 복구) */}
      <View style={styles.appBar}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>IPASS</Text>
        </View>
        <View style={styles.appBarActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications" size={24} color="indigo" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('MyPage')}>
            <Ionicons name="person" size={24} color="indigo" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.mainPadding}>
          
          {/* 1. 수업 정보 PageView 섹션 */}
          <View style={styles.pageViewSection}>
            <FlatList
              // 💡 자녀가 있으면 자녀 목록을, 없으면 사용자 본인 데이터를 리스트로 구성
              data={children.length > 0 ? children : [userData]} 
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
                setActiveChildIndex(index);
              }}
              renderItem={({ item }) => (
                <View style={styles.cardWrapper}>
                  {item ? (
                    // 성인 회원이면 본인 이름, 학부모면 자녀 이름을 targetName으로 전달
                    renderLessonCard(item.name, children.length > 0)
                  ) : (
                    <View style={[styles.cardInner, styles.emptyCard]}>
                      <Text style={styles.emptyText}>예약된 수업 정보가 없습니다.</Text>
                    </View>
                  )}
                </View>
              )}
              keyExtractor={(item, index) => item?.id || index.toString()}
            />
            {children.length > 1 && (
              <View style={styles.dotRow}>
                {children.map((_, i) => (
                  <View key={i} style={[styles.dot, activeChildIndex === i && styles.activeDot]} />
                ))}
              </View>
            )}
          </View>

          {/* 2. 광고 배너 섹션 */}
          <View style={styles.adBanner}>
            <Text style={styles.adContent}>
              현재 서비스 준비 중인 광고 영역입니다.{"\n"}추후 다양한 혜택과 소식으로 찾아뵙겠습니다.
            </Text>
          </View>
          <View style={styles.dotRow}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* 3. 공지사항 섹션 */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📢 공지사항</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notice')}>
              <Text style={styles.moreText}>더보기 {'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.noticeBox}>
            <TouchableOpacity style={styles.noticeRow}>
              <Text style={styles.noticeTitle} numberOfLines={1}>그라운드 코퍼레이션 신규 지점 오픈 안내</Text>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.noticeRow}>
              <Text style={styles.noticeTitle} numberOfLines={1}>여름 학기 수강 신청 기간 안내</Text>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* 4. 갤러리 섹션 */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>📸 갤러리</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Gallery')}>
              <Text style={styles.moreText}>더보기 +</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.galleryCard}>
                <View style={{ flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="image-outline" size={32} color="#D1D5DB" />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* 5. 푸터 (플러터 정보 100% 복구) */}
          <View style={styles.footer}>
            <Text style={styles.footerCompany}>(주)그라운드코퍼레이션</Text>
            <Text style={styles.footerText}>대표자 성명: 김강태</Text>
            <Text style={styles.footerText}>사업자등록번호: 441-86-03857</Text>
            <Text style={styles.footerText}>주소: 경기도 시흥시 서울대학로278번길 61, 7층 713호(배곧동, 서영베니스스퀘어)</Text>
            <Text style={styles.footerText}>통신판매업신고번호: 신고 예정</Text>
            <Text style={styles.footerText}>고객센터: groundcoporation@gmail.com</Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://docs.google.com/document/d/1w8fZDkcwXM6GATj6cAqmPHRny08w8KikLdFSuogXpmw/edit?usp=sharing')}>
                <Text style={styles.footerLinkBold}>이용약관</Text>
              </TouchableOpacity>
              <Text style={styles.footerText}>  |  </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://docs.google.com/document/d/1plQT2VJIrK8nxG1m3huj3LuUsCKea-dl37HEEBOhnJw/edit?usp=sharing')}>
                <Text style={styles.footerLinkBold}>개인정보 처리방침</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.copyRight}>© 2026 Ground Corporation. All rights reserved.</Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center', backgroundColor: '#fff' },
  logoPlaceholder: { width: 40, height: 40, borderRadius: 5, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 10, fontWeight: 'bold', color: '#9CA3AF' },
  appBarActions: { flexDirection: 'row' },
  iconBtn: { marginLeft: 12 },
  mainPadding: { padding: 16 },
  pageViewSection: { marginBottom: 12 },
  cardWrapper: { width: width - 32, height: 180 },
  cardInner: { flex: 1, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end' },
  cardBg: { ...StyleSheet.absoluteFillObject },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  cardContent: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardDateText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  cardChildText: { fontSize: 14, color: '#fff', marginTop: 4 },
  pickupBtn: { borderWidth: 1.5, borderColor: '#fff', borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6 },
  pickupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyCard: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
  adBanner: { height: 120, backgroundColor: '#2563EB', borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 20 },
  adContent: { fontSize: 18, color: '#fff', fontWeight: 'bold', textAlign: 'center', lineHeight: 24 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#3B82F6' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  moreText: { color: '#4B5563', fontSize: 14 },
  noticeBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  noticeRow: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noticeTitle: { fontSize: 16, flex: 1, marginRight: 10 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  galleryScroll: { flexDirection: 'row' },
  galleryCard: { width: 180, height: 200, marginRight: 10, borderRadius: 8, overflow: 'hidden' },
  footer: { marginTop: 40, paddingVertical: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerCompany: { fontSize: 14, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 12 },
  footerText: { fontSize: 12, color: '#9CA3AF', marginBottom: 4, lineHeight: 18 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  footerLinkBold: { fontSize: 12, fontWeight: 'bold', color: '#4B5563', textDecorationLine: 'underline' },
  copyRight: { fontSize: 11, color: '#D1D5DB', marginTop: 16 }
});