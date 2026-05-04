import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  StatusBar, Alert, TextInput, ActivityIndicator, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Picker } from '@react-native-picker/picker'; 

export default function AdminMemberDetailScreen({ navigation, route }: any) {
  const { userId } = route.params;
  const [activeTab, setActiveTab] = useState('package');
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [liveClassList, setLiveClassList] = useState<string[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<any[]>([]);

  useEffect(() => {
    fetchMemberDetail();
    fetchReservations();
    fetchLiveClasses();
  }, [userId]);

  // 1. 실시간 수업 목록 가져오기 (스크린샷의 target_class 사용)
  const fetchLiveClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('target_class');
      if (error) throw error;
      const uniqueClasses = Array.from(new Set(data.map(item => item.target_class))).filter(c => c);
      setLiveClassList(uniqueClasses as string[]);
    } catch (e: any) {
      console.error("수업 목록 로드 실패:", e.message);
    }
  };

  // 2. 회원 상세 정보
  const fetchMemberDetail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, phone, role, target_class,
          children!fk_children_parent (id, child_name, target_class),
          user_packages!fk_user_packages_user (id, package_name, remaining_count, total_count)
        `)
        .eq('id', userId)
        .single();
      if (error) throw error;
      setMember(data);
    } catch (e: any) {
      Alert.alert("오류", "회원 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 3. 예약 내역
  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', userId)
        .order('class_date', { ascending: false });
      if (error) throw error;
      setReservations(data || []);
    } catch (e: any) {
      console.error("예약 로드 실패");
    }
  };

  // 🚀 4. 수강권 목록 로드 (에러 해결 포인트!)
  const openPackageModal = async () => {
    try {
      const { data, error } = await supabase
        .from('package_options')
        .select(`
          id, label, total_count, price,
          packages!fk_package_option_parent ( name )
        `); // 👈 여기서 packages(price)를 요청하면 안 됩니다. packages에는 price가 없으니까요!
      
      if (error) throw error;
      setAvailableOptions(data || []);
      setModalVisible(true);
    } catch (e: any) {
      console.error("수강권 쿼리 에러:", e.message);
      Alert.alert("오류", "수강권 목록 로드 실패");
    }
  };

  const handleGrantPackage = async (option: any) => {
    try {
      const fullPackageName = `${option.packages?.name || '수강권'} - ${option.label}`;
      const { error } = await supabase
        .from('user_packages')
        .insert({
          user_id: userId,
          option_id: option.id,
          package_name: fullPackageName,
          total_count: option.total_count || 0,
          remaining_count: option.total_count || 0,
          status: 'ACTIVE'
        });
      if (error) throw error;
      Alert.alert("완료", "수강권이 부여되었습니다.");
      setModalVisible(false);
      fetchMemberDetail(); 
    } catch (e: any) {
      Alert.alert("부여 실패", e.message);
    }
  };

  const saveAllInfo = async () => {
    try {
      await supabase.from('users').update({ name: member.name, phone: member.phone, target_class: member.target_class }).eq('id', userId);
      if (member.children && member.children.length > 0) {
        for (const child of member.children) {
          await supabase.from('children').update({ target_class: child.target_class }).eq('id', child.id);
        }
      }
      Alert.alert("성공", "정보가 저장되었습니다.");
      fetchMemberDetail();
    } catch (e: any) {
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  if (loading || !member) return <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={28} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>회원 상세 관리</Text>
        <TouchableOpacity onPress={saveAllInfo}><Text style={styles.saveText}>저장</Text></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <Text style={styles.profileName}>{member.name} {member.role === 'admin' ? '관리자' : '회원'}</Text>
          <Text style={styles.profileSub}>{member.phone}</Text>
        </View>

        <View style={styles.tabContainer}>
          {[{id:'package', label:'수강권'}, {id:'log', label:'예약내역'}, {id:'info', label:'정보수정'}].map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]} onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contentSection}>
          {activeTab === 'package' && (
            <View>
              {member.user_packages.map((pkg: any) => (
                <View key={pkg.id} style={styles.packageCard}>
                  <Text style={styles.packageName}>{pkg.package_name}</Text>
                  <Text style={styles.countNum}>{pkg.remaining_count} / {pkg.total_count}회</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.addBtn} onPress={openPackageModal}>
                <Text style={styles.addBtnText}>+ 신규 수강권 부여</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'info' && (
            <View style={styles.infoForm}>
              <Text style={styles.inputLabel}>회원 연락처</Text>
              <TextInput style={styles.input} value={member.phone} onChangeText={(t) => setMember({...member, phone: t})} />
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>반 배정 관리</Text>
              {member.children && member.children.length > 0 ? (
                member.children.map((child: any, idx: number) => (
                  <View key={child.id} style={styles.childSelectBox}>
                    <Text style={styles.childLabel}>{child.child_name} 학생</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={child.target_class}
                        onValueChange={(val: string) => {
                          const newChildren = [...member.children];
                          newChildren[idx].target_class = val;
                          setMember({ ...member, children: newChildren });
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="수업반 선택" value="" />
                        {liveClassList.map(cls => <Picker.Item key={cls} label={cls} value={cls} />)}
                      </Picker>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.childSelectBox}>
                  <Text style={styles.childLabel}>{member.name} (본인)</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={member.target_class}
                      onValueChange={(val: string) => setMember({...member, target_class: val})}
                      style={styles.picker}
                    >
                      <Picker.Item label="수업반 선택" value="" />
                      {liveClassList.map(cls => <Picker.Item key={cls} label={cls} value={cls} />)}
                    </Picker>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 수강권 부여 모달 */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>수강권 선택</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
            </View>
            <ScrollView>
              {availableOptions.map((opt) => (
                <TouchableOpacity key={opt.id} style={styles.optionItem} onPress={() => handleGrantPackage(opt)}>
                  <View>
                    <Text style={styles.optParent}>{opt.packages?.name}</Text>
                    <Text style={styles.optLabel}>{opt.label} ({opt.total_count}회)</Text>
                  </View>
                  <Text style={styles.optPrice}>{opt.price?.toLocaleString()}원</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  saveText: { color: '#6366F1', fontWeight: '800', fontSize: 16 },
  profileSection: { padding: 30, backgroundColor: '#FFF', alignItems: 'center' },
  profileName: { fontSize: 20, fontWeight: '800' },
  profileSub: { fontSize: 14, color: '#94A3B8' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabItem: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 3, borderBottomColor: '#6366F1' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  activeTabText: { color: '#6366F1', fontWeight: '800' },
  contentSection: { padding: 20 },
  packageCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2 },
  packageName: { fontSize: 14, color: '#64748B' },
  countNum: { fontSize: 24, fontWeight: '900' },
  addBtn: { backgroundColor: '#6366F1', padding: 18, borderRadius: 20, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontWeight: '800' },
  infoForm: { backgroundColor: '#FFF', padding: 20, borderRadius: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 15 },
  inputLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', marginBottom: 5 },
  input: { fontSize: 16, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10 },
  divider: { height: 30 },
  childSelectBox: { marginBottom: 20 },
  childLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  pickerWrapper: { backgroundColor: '#F1F5F9', borderRadius: 12, overflow: 'hidden' },
  picker: { height: 50, width: '100%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  optParent: { fontSize: 11, color: '#6366F1', fontWeight: '700' },
  optLabel: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  optPrice: { fontSize: 15, fontWeight: '800', color: '#10B981' }
});