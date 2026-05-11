import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// 💡 휴대폰 번호 자동 하이픈 포맷팅 함수
const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
};

export default function ChildManagementScreen({ navigation }: any) {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 💡 모달 상태 관리
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  
  // 💡 폼 입력 상태 
  const [childName, setChildName] = useState("");
  const [childBirth, setChildBirth] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [childPhone, setChildPhone] = useState(""); 
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from("children")
          .select("*")
          .eq("parent_id", user.id)
          .order("created_at", { ascending: true });
        setChildren(data || []);
      }
    } catch (error) {
      console.log("자녀 정보 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 모달 열기 (추가 모드)
  const openAddModal = () => {
    setIsEditing(false);
    setEditingChildId(null);
    setChildName("");
    setChildBirth("");
    setGender("M");
    setChildPhone("");
    setModalVisible(true);
  };

  // 모달 열기 (수정 모드)
  const openEditModal = (child: any) => {
    setIsEditing(true);
    setEditingChildId(child.id);
    setChildName(child.child_name || "");
    setChildBirth(child.child_birth || "");
    setGender(child.gender === "F" ? "F" : "M");
    // DB에서 가져온 하이픈 없는 번호를 화면용으로 포맷팅
    setChildPhone(child.child_phone ? formatPhoneNumber(child.child_phone) : "");
    setModalVisible(true);
  };

  // 💾 자녀 추가 및 수정 저장 로직
  const handleSave = async () => {
    if (!childName.trim()) return Alert.alert("알림", "자녀 이름을 입력해주세요.");
    // 💡 생년월일 8자리 검사로 변경!
    if (childBirth.trim().length !== 8) return Alert.alert("알림", "생년월일 8자리를 입력해주세요. (예: 20150505)");
    if (!userId) return;

    setSaving(true);
    try {
      // 💡 DB 저장용: 하이픈 모두 제거한 순수 숫자만
      const rawPhone = childPhone.replace(/-/g, "");

      const payload = {
        child_name: childName.trim(),
        child_birth: childBirth.trim(),
        gender: gender,
        child_phone: rawPhone || null, // 비어있으면 null
      };

      if (isEditing && editingChildId) {
        const { error } = await supabase.from("children").update(payload).eq("id", editingChildId);
        if (error) throw error;
        Alert.alert("성공", "자녀 정보가 수정되었습니다.");
      } else {
        const { error } = await supabase.from("children").insert({ parent_id: userId, ...payload });
        if (error) throw error;
        Alert.alert("성공", "새 자녀가 등록되었습니다.");
      }
      
      setModalVisible(false);
      fetchChildren(); 
    } catch (error: any) {
      Alert.alert("오류", "저장 중 문제가 발생했습니다.");
      console.log(error);
    } finally {
      setSaving(false);
    }
  };

  // 🗑️ 자녀 삭제 로직 
  const handleDelete = async (childId: string, childName: string) => {
    Alert.alert(
      "자녀 삭제 확인",
      `정말 '${childName}' 자녀 정보를 삭제하시겠습니까?\n(보유한 이용권이나 예약 내역이 있으면 삭제할 수 없습니다.)`,
      [
        { text: "취소", style: "cancel" },
        { 
          text: "삭제하기", 
          style: "destructive",
          onPress: async () => {
            try {
              const { data: packages } = await supabase.from("user_packages").select("id").eq("child_id", childId).limit(1);
              if (packages && packages.length > 0) return Alert.alert("삭제 불가", "해당 자녀에게 구매한 이용권 내역이 존재합니다.");

              const { data: reservations } = await supabase.from("reservations").select("id").eq("child_id", childId).limit(1);
              if (reservations && reservations.length > 0) return Alert.alert("삭제 불가", "해당 자녀의 예약 내역이 존재합니다.");

              const { error } = await supabase.from("children").delete().eq("id", childId);
              if (error) throw error;
              
              Alert.alert("삭제 완료", `'${childName}' 자녀 정보가 삭제되었습니다.`);
              fetchChildren();
            } catch (error) {
              Alert.alert("오류", "삭제 중 문제가 발생했습니다.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 자녀 관리</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {children.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="baby-face-outline" size={48} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>등록된 자녀가 없습니다</Text>
            <Text style={styles.emptySub}>아래 버튼을 눌러 자녀를 등록해주세요.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {children.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.childCardLeft}>
                  <View style={[styles.childAvatar, child.gender === 'F' && { backgroundColor: '#FCE7F3' }]}>
                    <MaterialCommunityIcons 
                      name={child.gender === 'F' ? "face-woman-profile" : "face-man-profile"} 
                      size={28} 
                      color={child.gender === 'F' ? "#DB2777" : "#4F46E5"} 
                    />
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.childName}>{child.child_name}</Text>
                      <View style={[styles.genderBadge, child.gender === 'F' && { backgroundColor: '#FBCFE8' }]}>
                        <Text style={[styles.genderBadgeText, child.gender === 'F' && { color: '#BE185D' }]}>
                          {child.gender === 'F' ? '여' : '남'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.childBirth}>생년월일: {child.child_birth}</Text>
                    {child.child_phone && (
                      // 💡 DB에서 가져온 순수 번호를 리스트에서 예쁘게 하이픈 처리해서 표시
                      <Text style={styles.childPhoneText}>📱 {formatPhoneNumber(child.child_phone)}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(child)}>
                    <Ionicons name="pencil" size={20} color="#64748B" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={() => handleDelete(child.id, child.child_name)}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomFooter}>
        <TouchableOpacity style={styles.mainBtn} onPress={openAddModal}>
          <Ionicons name="add" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.mainBtnText}>새 자녀 등록하기</Text>
        </TouchableOpacity>
      </View>

      {/* 📝 자녀 추가/수정 모달 */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)} >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? "자녀 정보 수정" : "새 자녀 등록"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>자녀 이름 <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={childName}
                  onChangeText={setChildName}
                  placeholder="이름을 입력하세요"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>생년월일 <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={childBirth}
                  onChangeText={setChildBirth}
                  // 💡 안내 문구 및 최대 길이 변경 (8자리)
                  placeholder="8자리 입력 (예: 20150505)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={8} 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>성별 <Text style={{ color: '#EF4444' }}>*</Text></Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity 
                    style={[styles.genderBtn, gender === "M" && styles.genderBtnActiveM]} 
                    onPress={() => setGender("M")}
                  >
                    <Text style={[styles.genderBtnText, gender === "M" && styles.genderBtnTextActive]}>남자</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderBtn, gender === "F" && styles.genderBtnActiveF]} 
                    onPress={() => setGender("F")}
                  >
                    <Text style={[styles.genderBtnText, gender === "F" && styles.genderBtnTextActive]}>여자</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>자녀 연락처 <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(선택)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={childPhone}
                  // 💡 입력할 때마다 알아서 하이픈이 그어집니다!
                  onChangeText={(text) => setChildPhone(formatPhoneNumber(text))}
                  placeholder="010-0000-0000 (없는 경우 생략)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={13} // 하이픈 포함 최대 길이
                />
              </View>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>{isEditing ? "수정 완료" : "등록 완료"}</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} /> 
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  listContainer: { marginTop: 10 },
  childCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF", padding: 20, borderRadius: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  childCardLeft: { flexDirection: "row", alignItems: "center" },
  childAvatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 16 },
  childName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  
  genderBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  genderBadgeText: { fontSize: 10, fontWeight: "700", color: "#1D4ED8" },
  
  childBirth: { fontSize: 13, color: "#64748B", marginTop: 2 },
  childPhoneText: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  
  actionButtons: { flexDirection: "row" },
  iconBtn: { padding: 8, backgroundColor: "#F8FAFC", borderRadius: 10 },

  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 80 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#64748B" },

  bottomFooter: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#F8FAFC", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.02)" },
  mainBtn: { flexDirection: "row", backgroundColor: "#4F46E5", paddingVertical: 16, borderRadius: 16, justifyContent: "center", alignItems: "center", shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  mainBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxHeight: "90%", backgroundColor: "#FFF", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#4B5563", marginBottom: 8, paddingLeft: 4 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#111827" },
  
  genderRow: { flexDirection: "row", justifyContent: "space-between" },
  genderBtn: { flex: 1, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginHorizontal: 4 },
  genderBtnActiveM: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  genderBtnActiveF: { backgroundColor: "#DB2777", borderColor: "#DB2777" },
  genderBtnText: { fontSize: 15, fontWeight: "600", color: "#64748B" },
  genderBtnTextActive: { color: "#FFF" },

  modalSaveBtn: { backgroundColor: "#4F46E5", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 10 },
  modalSaveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" }
});