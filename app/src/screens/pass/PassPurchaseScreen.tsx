import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  StatusBar, Dimensions, Platform, Linking, ActivityIndicator, Modal, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// 💳 KSPay 모달 서비스 임포트
import KSPayService from '../../services/payment/KSPayService';

interface PackageOption { id: string; label: string; price: number; }
interface Package {
  id: string; name: string; description: string; category_id: string;
  is_consult: boolean; price?: number; total_sessions?: number;
  duration_in_days?: number; weekly_limit?: number; package_options: PackageOption[];
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === 0) return '상담 요망';
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '원';
};

export default function PassPurchaseScreen({ navigation }: any) {
  const [selectedBranchId, setSelectedBranchId] = useState<'branch_1' | 'branch_2'>('branch_1');
  const [activeCategory, setActiveCategory] = useState<string>('regular');
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [selectedCountIndex, setSelectedCountIndex] = useState<number>(0);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [showOptionModal, setShowOptionModal] = useState(false);
  
  const [showKSPay, setShowKSPay] = useState(false);
  const [addShuttle, setAddShuttle] = useState(false);
  const [addJelly, setAddJelly] = useState(false);

  // 💡 신규 추가된 상태: 반 배정 여부(신규 회원 판별) 및 상담 모달 표시 여부
  const [isClassAssigned, setIsClassAssigned] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  
  // 💡 신규 추가된 상태: 현재 선택된 지점의 DB 연락처 정보 저장
  const [branchContact, setBranchContact] = useState({ phone: '', kakao: '' });

  useEffect(() => { 
    fetchInitialData();
    fetchPackagesFromDB(); 
    console.log("요청 지점:", selectedBranchId, "요청 카테고리:", activeCategory);
  }, [selectedBranchId, activeCategory]);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setCurrentUser(profile);

      // 💡 유저 정보에 등록된 소속 지점이 있다면 알아서 화면 세팅!--이부분이 문제가생겨서 주석처리
      // if (profile && profile.branch_id) {
      //   setSelectedBranchId(profile.branch_id);
      // }

      // 자녀 정보를 먼저 불러옵니다 (자녀의 타겟 클래스도 확인하기 위해)
      const { data: children } = await supabase.from('children').select('*').eq('parent_id', user.id);
      if (children && children.length > 0) setSelectedChild(children[0]);

      // 💡 핵심 로직: 유저 정보에 반 배정 기록(target_class)이 있는지 확인하여 신규 회원 구분
      // String()으로 감싸서 숫자가 들어가도 에러가 나지 않게 방어, 공백만 있는 경우도 걸러냄
      const isAdultAssigned = profile && profile.target_class && String(profile.target_class).trim() !== '';
      const isChildAssigned = children && children.length > 0 && children.some((child: any) => child.target_class && String(child.target_class).trim() !== '');

      if (isAdultAssigned || isChildAssigned) {
        setIsClassAssigned(true); // 반 배정 완료 (기존 회원)
      } else {
        setIsClassAssigned(false); // 반 배정 전 (신규 회원) - 테스트 시 여기를 강제로 true로 바꿔보세요!
      }
    }
  };

  const fetchPackagesFromDB = async () => {
    setLoading(true);
    try {
      // 🚀 패키지를 불러올 때, 현재 선택된 지점의 연락처(DB)도 같이 불러옵니다!
      const { data: branchData } = await supabase.from('branches').select('phone_number, kakao_link').eq('id', selectedBranchId).single();
      if (branchData) {
        setBranchContact({ phone: branchData.phone_number || '', kakao: branchData.kakao_link || '' });
      }

      const { data, error } = await supabase
        .from('packages')
        .select(`*, package_options (*)`)
        .eq('branch_id', selectedBranchId)
        .eq('category_id', activeCategory)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setPackages(data || []);
      if (data && data.length > 0) {
        setSelectedMainId(data[0].id);
        setSelectedCountIndex(0);
      }
    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  // 전화상담 - DB에 내역 기록 후 지점 전화번호(DB 연동)로 연결
  const handleCall = async () => {
    setShowConsultModal(false);
    if (currentUser) {
      try {
        await supabase.from('consultation_requests').insert({
          user_id: currentUser.id,
          branch_id: selectedBranchId,
          request_type: 'PHONE',
          status: 'PENDING'
        });
      } catch (error) { console.error('상담 내역 저장 에러:', error); }
    }
    // DB에 값이 없으면 기본값, 있으면 DB 값으로 연결
    Linking.openURL(`tel:${branchContact.phone || '010-0000-0000'}`); 
  };

  // 카카오톡 - DB에 내역 기록 후 지점 카톡링크(DB 연동)로 연결
  const handleKakao = async () => {
    setShowConsultModal(false);
    if (currentUser) {
      try {
        await supabase.from('consultation_requests').insert({
          user_id: currentUser.id,
          branch_id: selectedBranchId,
          request_type: 'KAKAO',
          status: 'PENDING'
        });
      } catch (error) { console.error('상담 내역 저장 에러:', error); }
    }
    // DB에 값이 없으면 기본값, 있으면 DB 값으로 연결
    Linking.openURL(branchContact.kakao || 'https://pf.kakao.com/_xxxxxx'); 
  };

  const currentSelection = packages.find(p => p.id === selectedMainId);
  const basePrice = currentSelection?.is_consult ? 0 : (currentSelection?.package_options && currentSelection.package_options.length > 0 ? currentSelection.package_options[selectedCountIndex].price : (currentSelection?.price || 0));
  const finalPrice = basePrice + (addShuttle ? 14000 : 0) + (addJelly ? 39600 : 0);

  const handleOpenPayment = () => {
    if (!selectedChild && !currentUser) {
      Alert.alert("알림", "사용자 정보를 불러올 수 없습니다. 다시 시도해주세요.");
      return;
    }
    setShowOptionModal(false);
    setShowKSPay(true); 
  };

  // 💡 임시: 개발자(코치)인지 일반 유저인지 판별 (role이 admin일 경우만 스위처 노출)
  const isDeveloper = currentUser?.role === 'admin';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={28} color="#111827" /></TouchableOpacity>
        
        {/* 🚀 개발자는 스위처, 일반 유저는 고정 텍스트로 노출 */}
        {isDeveloper ? (
          <TouchableOpacity style={styles.branchSwitcher} onPress={() => setSelectedBranchId(selectedBranchId === 'branch_1' ? 'branch_2' : 'branch_1')}>
            <Text style={styles.headerTitle}>{selectedBranchId === 'branch_1' ? '시흥본점' : '영종도점'} 이용권</Text>
            <Ionicons name="swap-horizontal" size={16} color="#6366F1" style={{marginLeft: 6}} />
          </TouchableOpacity>
        ) : (
          <View style={styles.branchStatic}>
            <Text style={styles.headerTitle}>{selectedBranchId === 'branch_1' ? '시흥본점' : '영종도점'} 이용권</Text>
          </View>
        )}

        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 탭 메뉴 */}
        <View style={styles.tabContainer}>
          {[{ id: 'regular', name: '정규반' }, { id: 'care', name: '집중케어' }, { id: 'lesson', name: '레슨/상담' }, { id: 'rental', name: '기타' }].map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tab, activeCategory === tab.id && styles.activeTab]} onPress={() => setActiveCategory(tab.id)}>
              <Text style={[styles.tabText, activeCategory === tab.id && styles.activeTabText]}>{tab.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mainPadding}>
          {/* 이벤트 배너 (추후 DB 연동 가능) */}
          <View style={styles.eventBanner}>
            <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>EVENT</Text></View>
            <Text style={styles.eventText}>선착순 50명 가입비 면제 혜택!</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{marginTop: 50}} />
          ) : (
            packages.map((item) => {
              const isSelected = selectedMainId === item.id;
              return (
                <View key={item.id} style={[styles.packageCard, isSelected && styles.selectedCard]}>
                  <TouchableOpacity style={styles.cardHeader} onPress={() => {setSelectedMainId(item.id); setSelectedCountIndex(0);}}>
                    <View style={[styles.radioCircle, isSelected && styles.activeRadio]}>{isSelected && <View style={styles.radioInner} />}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageName}>{item.name}</Text>
                      {item.description && <Text style={styles.packageSubDesc}>{item.description}</Text>}
                    </View>
                  </TouchableOpacity>
                  {isSelected && !item.is_consult && (
                    <View style={styles.optionContainer}>
                      <View style={styles.chipRow}>
                        {item.package_options?.map((opt, idx) => (
                          <TouchableOpacity key={opt.id} style={[styles.chip, selectedCountIndex === idx && styles.activeChip]} onPress={() => setSelectedCountIndex(idx)}>
                            <Text style={[styles.chipText, selectedCountIndex === idx && styles.activeChipText]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.priceValue}>{formatCurrency(item.package_options[selectedCountIndex]?.price || item.price || 0)}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* 복구된 하단 공지사항 / 유의사항 영역 */}
          <View style={styles.bottomInfo}>
            <Text style={styles.infoTitle}>📌 꼭 확인해주세요!</Text>
            <Text style={styles.infoItem}>• 가입비 최초 1회 10만원 (유니폼+젤리 지급)</Text>
            <Text style={styles.infoItem}>• 모든 수업료는 부가세 별도 금액입니다.</Text>
            <Text style={styles.infoItem}>• 카드사 할인 및 할부는 결제창에서 확인 가능합니다.</Text>
          </View>
        </View>
      </ScrollView>

      {/* 하단 플로팅 바 */}
      <View style={styles.floatingFooter}>
        <View style={styles.footerPriceBox}>
          <Text style={styles.footerLabel}>선택 금액</Text>
          <Text style={styles.footerPrice}>{currentSelection?.is_consult ? '상담 대기' : formatCurrency(basePrice)}</Text>
        </View>
        
        {/* 🚀 인터셉트 로직 적용된 메인 버튼 */}
        <TouchableOpacity 
          style={[styles.mainActionBtn, currentSelection?.is_consult && styles.consultActionBtn]} 
          onPress={() => {
            if (currentSelection?.is_consult) {
              // 💡 여기도 하드코딩 제거! DB에서 불러온 번호 사용
              Linking.openURL(`tel:${branchContact.phone || '010-0000-0000'}`);
            } else if (!isClassAssigned) {
              // 💡 신규 회원(반 배정 안된 유저)이 결제 누르면 모달 띄우기!
              setShowConsultModal(true);
            } else {
              // 기존 회원이면 기존에 있던 추가 옵션 모달창 띄우기
              setShowOptionModal(true);
            }
          }}
        >
          <Text style={styles.mainActionText}>{currentSelection?.is_consult ? '상담 전화하기' : '결제하기'}</Text>
        </TouchableOpacity>
      </View>

      {/* 💡 신규 회원용 상담 유도 커스텀 모달 (팝업) */}
      <Modal visible={showConsultModal} transparent={true} animationType="fade" onRequestClose={() => setShowConsultModal(false)}>
        <View style={styles.consultModalOverlay}>
          <View style={styles.consultModalContent}>
            <View style={styles.consultModalIconBg}>
              <Ionicons name="chatbubbles" size={32} color="#6366F1" />
            </View>
            <Text style={styles.consultModalTitle}>상담이 필요합니다!</Text>
            <Text style={styles.consultModalDesc}>
              첫 수강생은 원활한 수업을 위해{'\n'}반 배정 상담 후 결제가 가능합니다.
            </Text>

            <View style={styles.consultModalBtnContainer}>
              <TouchableOpacity style={styles.consultKakaoBtn} onPress={handleKakao}>
                <Ionicons name="chatbubble" size={20} color="#111827" style={{ marginRight: 8 }} />
                <Text style={styles.consultKakaoText}>카카오톡 문의</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.consultCallBtn} onPress={handleCall}>
                <Ionicons name="call" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.consultCallText}>전화 상담</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.consultCloseBtn} onPress={() => setShowConsultModal(false)}>
              <Text style={styles.consultCloseBtnText}>나중에 할게요</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 기존 추가 옵션 모달 */}
      <Modal visible={showOptionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>추가 옵션 선택</Text>
              <TouchableOpacity onPress={() => setShowOptionModal(false)}><Ionicons name="close" size={24} color="#111827" /></TouchableOpacity>
            </View>
            <View style={styles.optionList}>
              <TouchableOpacity style={styles.optionItem} onPress={() => setAddShuttle(!addShuttle)}>
                <Ionicons name={addShuttle ? "checkbox" : "square-outline"} size={24} color={addShuttle ? "#6366F1" : "#D1D5DB"} />
                <Text style={styles.optionName}>유료 셔틀버스 신청 (+14,000원)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => setAddJelly(!addJelly)}>
                <Ionicons name={addJelly ? "checkbox" : "square-outline"} size={24} color={addJelly ? "#6366F1" : "#D1D5DB"} />
                <Text style={styles.optionName}>키즈젤리 단품 (+39,600원)</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalFooter}>
              <View style={styles.modalPriceBox}><Text style={styles.modalPriceValue}>{formatCurrency(finalPrice)}</Text></View>
              <TouchableOpacity style={styles.finalPayBtn} onPress={handleOpenPayment}><Text style={styles.finalPayBtnText}>최종 결제 진행</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 💳 KSPay 결제 모달 */}
      {currentUser && (
        <KSPayService 
          isVisible={showKSPay}
          onClose={(success) => {
            setShowKSPay(false);
            if (success) navigation.navigate('ReservationSuccess');
            else navigation.navigate('ReservationFail');
          }}
          paymentData={{
            amount: finalPrice,
            packageName: `${currentSelection?.name} (${currentSelection?.package_options[selectedCountIndex]?.label || '기본'})`,
            userName: currentUser.name,
            userPhone: currentUser.phone || "01000000000",
            packageId: selectedMainId || "",
            userId: currentUser.id,
            childId: selectedChild ? selectedChild.id : null, 
            childName: selectedChild ? selectedChild.child_name : "본인",
            totalSessions: currentSelection?.total_sessions || 10,
            durationInDays: currentSelection?.duration_in_days || 30,
            weeklyLimit: currentSelection?.weekly_limit || 2,
            branchId: selectedBranchId,
            branchName: selectedBranchId === 'branch_1' ? '시흥본점' : '영종도점'
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  branchSwitcher: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  branchStatic: { paddingHorizontal: 12, paddingVertical: 6 }, // 💡 일반 유저용 스위처 없는 헤더 텍스트 여백
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20, paddingBottom: 10 },
  tab: { marginRight: 20, paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#6366F1' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  activeTabText: { color: '#111827', fontWeight: '800' },
  scrollContent: { paddingBottom: 140 },
  mainPadding: { padding: 20 },
  eventBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1B4B', padding: 16, borderRadius: 20, marginBottom: 20 },
  eventBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 10 },
  eventBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  eventText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  packageCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  selectedCard: { borderColor: '#6366F1', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activeRadio: { borderColor: '#6366F1' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6366F1' },
  packageName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  packageSubDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  optionContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F8FAFC', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  activeChip: { backgroundColor: '#1E1B4B', borderColor: '#1E1B4B' },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  activeChipText: { color: '#FFF' },
  priceValue: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'right' },
  
  bottomInfo: { marginTop: 20, padding: 20, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
  infoItem: { fontSize: 12, color: '#64748B', marginBottom: 6, lineHeight: 18 },

  floatingFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#111827', borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerPriceBox: { flex: 1 },
  footerLabel: { color: '#94A3B8', fontSize: 10 },
  footerPrice: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  mainActionBtn: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18 },
  consultActionBtn: { backgroundColor: '#10B981' },
  mainActionText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  
  // 기존 옵션 모달 스타일
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  optionList: { marginBottom: 30 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  optionName: { marginLeft: 10, fontSize: 15 },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20, flexDirection: 'row', alignItems: 'center' },
  modalPriceBox: { flex: 1 },
  modalPriceValue: { fontSize: 20, fontWeight: 'bold' },
  finalPayBtn: { backgroundColor: '#6366F1', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 16 },
  finalPayBtnText: { color: '#FFF', fontWeight: 'bold' },

  // 💡 신규 회원 상담 모달 전용 스타일 추가 (기존 모달과 겹치지 않게 이름 분리)
  consultModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  consultModalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  consultModalIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  consultModalTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  consultModalDesc: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  consultModalBtnContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: 16 },
  consultKakaoBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FEE500', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  consultKakaoText: { color: '#111827', fontSize: 15, fontWeight: '700' },
  consultCallBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#6366F1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  consultCallText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  consultCloseBtn: { paddingVertical: 10 },
  consultCloseBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' }
});