import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

export default function ProfileEditScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 💡 폼 상태 관리
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupSpot, setPickupSpot] = useState(""); 
  const [createdAt, setCreatedAt] = useState(""); // 가입일 추가

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        setCreatedAt(new Date(user.created_at).toLocaleDateString() || "");
        
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (profile) {
          setName(profile.name || "");
          setPhone(profile.phone || "");
          setPickupSpot(profile.default_pickup || "설정된 장소 없음"); 
        }
      }
    } catch (error) {
      console.log("유저 정보 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert("알림", "이름을 입력해주세요.");
    if (!phone.trim()) return Alert.alert("알림", "휴대폰 번호를 입력해주세요.");

    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      Alert.alert("성공", "내 정보가 성공적으로 수정되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert("오류", "정보 수정 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert("안내", "가입하신 이메일로 비밀번호 재설정 링크를 발송했습니다.\n이메일함을 확인해주세요!");
    } catch (error: any) {
      Alert.alert("오류", "비밀번호 재설정 이메일 발송에 실패했습니다.");
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 정보 관리</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <Text style={styles.saveBtnText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* 1. 프로필 이미지 (허전함 채우기 용도) */}
          <View style={styles.profileImageSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{name ? name.substring(0, 1) : "U"}</Text>
            </View>
            <TouchableOpacity style={styles.photoEditBtn} onPress={() => Alert.alert("안내", "프로필 사진 변경 기능 준비 중")}>
              <Text style={styles.photoEditBtnText}>사진 변경</Text>
            </TouchableOpacity>
          </View>

          {/* 2. 계정 기본 정보 (읽기 전용) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>계정 정보</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일 아이디 (변경 불가)</Text>
              <View style={[styles.inputContainer, styles.disabledInput]}>
                <Text style={styles.disabledText}>{email}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>가입일</Text>
              <View style={[styles.inputContainer, styles.disabledInput]}>
                <Text style={styles.disabledText}>{createdAt}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.passwordBtn} onPress={handlePasswordReset}>
              <Ionicons name="lock-closed-outline" size={18} color="#4B5563" />
              <Text style={styles.passwordBtnText}>비밀번호 재설정 이메일 받기</Text>
            </TouchableOpacity>
          </View>

          {/* 3. 수정 가능한 개인 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>개인 정보</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>학부모 이름</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="이름을 입력해주세요"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>휴대폰 번호</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* 4. 등하원 정보 (팀장님 피드백 반영: 읽기 전용) */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>등하원 정보</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>현재 설정된 기본 픽업 장소</Text>
              <View style={[styles.inputContainer, styles.disabledInput]}>
                <Text style={styles.disabledText}>{pickupSpot}</Text>
              </View>
              <Text style={styles.helperText}>* 픽업 장소 변경은 홈 화면의 '등하원' 메뉴에서 가능합니다.</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#4F46E5" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // 프로필 이미지 영역
  profileImageSection: { alignItems: "center", marginBottom: 32, marginTop: 10 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#4F46E5" },
  photoEditBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#F1F5F9", borderRadius: 20 },
  photoEditBtnText: { fontSize: 13, fontWeight: "600", color: "#475569" },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1E293B", marginBottom: 16, paddingLeft: 4 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8, paddingLeft: 4 },
  inputContainer: { backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  input: { paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: "#111827" },
  
  disabledInput: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  disabledText: { paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: "#94A3B8" },
  
  helperText: { fontSize: 12, color: "#4F46E5", marginTop: 8, paddingLeft: 4, fontWeight: "500" },
  
  passwordBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFF", paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginTop: 4 },
  passwordBtnText: { fontSize: 14, fontWeight: "600", color: "#4B5563", marginLeft: 8 },
});