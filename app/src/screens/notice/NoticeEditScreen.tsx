import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // 🚨 Supabase 연동 필수!
import { Picker } from "@react-native-picker/picker"; // 🚀 지점 선택용 드롭다운

// 🚀 [추가] 전역 상태에서 권한 스위치와 내 지점(branchId) 가져오기
import { useAuth } from "../../context/AuthContext";

export default function NoticeEditScreen({ route, navigation }: any) {
  // 🚀 [리팩토링 완료] role 대신 명품 스위치 isAdmin을 가져옵니다!
  const { branchId: myBranchId, isAdmin } = useAuth();

  // 이전 화면에서 notice 데이터를 넘겨받았다면 '수정' 모드
  const existingNotice = route.params?.notice;
  const isEditing = !!existingNotice;

  const [title, setTitle] = useState(existingNotice?.title || "");
  const [content, setContent] = useState(existingNotice?.content || "");
  const [isImportant, setIsImportant] = useState(existingNotice?.is_important || false);
  const [isOnHome, setIsOnHome] = useState(existingNotice?.is_on_home || false); // 💡 새로 추가된 홈 노출 설정
  
  // 🚀 [수정] 어드민이면 기본값이 전체공유(null), 직원이면 본인 지점(myBranchId)
  const [targetBranchId, setTargetBranchId] = useState<string | null>(
    existingNotice ? existingNotice.branch_id : (isAdmin ? null : myBranchId)
  );

  const [branches, setBranches] = useState<any[]>([]); // 지점 목록 (어드민용)
  const [myBranchName, setMyBranchName] = useState(""); // 🚀 [추가] 코치용 지점 이름 상태
  const [loading, setLoading] = useState(false);

  // 🚀 [수정] 화면 진입 시 지점 정보를 불러옵니다. (isAdmin 스위치 적용)
  useEffect(() => {
    if (isAdmin) {
      fetchAllBranches();
    } else {
      fetchMyBranchName(); // 🚀 코치는 본인 지점 이름만 가져옴
    }
  }, [isAdmin, myBranchId]);

  // 🚀 [수정] 어드민용: 모든 지점을 순서대로(display_order) 가져옵니다.
  const fetchAllBranches = async () => {
    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .order("display_order", { ascending: true }); // 💡 여기서 순서 정렬!
      if (data) setBranches(data);
    } catch (e) {
      console.log("지점 목록 로드 실패:", e);
    }
  };

  // 🚀 [추가] 코치용: 본인 지점의 실제 이름을 가져옵니다.
  const fetchMyBranchName = async () => {
    if (!myBranchId) return;
    try {
      const { data } = await supabase
        .from("branches")
        .select("name")
        .eq("id", myBranchId)
        .single();
      if (data) setMyBranchName(data.name);
    } catch (e) {
      console.log("지점명 로드 실패:", e);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("알림", "제목과 내용을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const noticeData = {
        title,
        content,
        is_important: isImportant,
        is_on_home: isOnHome,
        author_id: user?.id || null, 
        branch_id: targetBranchId, 
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { error } = await supabase
          .from("notices")
          .update(noticeData)
          .eq("id", existingNotice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notices")
          .insert([noticeData]);
        if (error) throw error;
      }

      setLoading(false);
      Alert.alert("성공", isEditing ? "공지사항이 수정되었습니다." : "공지사항이 등록되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.log("저장 에러:", error);
      setLoading(false);
      Alert.alert("오류", "저장 중 문제가 발생했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{isEditing ? "공지사항 수정" : "새 공지사항"}</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <Text style={styles.saveBtnText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 🚀 [수정] 지점 선택 영역 UI 개선 (isAdmin 스위치 적용) */}
        <View style={styles.branchSelectSection}>
          <Text style={styles.sectionLabel}>게시 대상 설정</Text>
          {isAdmin ? (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={targetBranchId}
                onValueChange={(itemValue) => setTargetBranchId(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="🌐 전체 지점 통합 공지" value={null} />
                {branches.map((b) => (
                  <Picker.Item key={b.id} label={`📍 ${b.name}`} value={b.id} />
                ))}
              </Picker>
            </View>
          ) : (
            <View style={styles.readOnlyBranch}>
              <Ionicons name="location-sharp" size={16} color="#6366F1" />
              {/* 🚀 [수정] 코치에게 실제 본인 지점 이름을 보여줍니다. */}
              <Text style={styles.readOnlyBranchText}>
                📍 {myBranchName || "로딩 중..."} 공지로 등록됩니다.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* 중요 공지 스위치 */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>중요 공지로 등록</Text>
            <Text style={styles.switchSub}>목록 상단에 중요 뱃지와 함께 노출됩니다.</Text>
          </View>
          <Switch
            value={isImportant}
            onValueChange={setIsImportant}
            trackColor={{ false: "#E2E8F0", true: "#4F46E5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        {/* 홈 화면 노출 스위치 */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>홈 화면 노출</Text>
            <Text style={styles.switchSub}>체크 시 앱 메인 홈 화면에도 노출됩니다.</Text>
          </View>
          <Switch
            value={isOnHome}
            onValueChange={setIsOnHome}
            trackColor={{ false: "#E2E8F0", true: "#4F46E5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        {/* 제목 입력 */}
        <TextInput
          style={styles.titleInput}
          placeholder="제목을 입력하세요"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />

        <View style={styles.divider} />

        {/* 내용 입력 */}
        <TextInput
          style={styles.contentInput}
          placeholder="공지사항 내용을 입력하세요..."
          placeholderTextColor="#94A3B8"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  appBarTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#4F46E5" },
  container: { flex: 1 },
  
  branchSelectSection: { padding: 20, backgroundColor: "#F8FAFC" },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#64748B", marginBottom: 10 },
  pickerWrapper: { backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  picker: { height: 50, width: "100%" },
  readOnlyBranch: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  readOnlyBranchText: { marginLeft: 6, fontSize: 14, color: "#4F46E5", fontWeight: "700" },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  switchLabel: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  switchSub: { fontSize: 12, color: "#64748B" },
  divider: { height: 1, backgroundColor: "#F1F5F9" },
  titleInput: {
    padding: 20,
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  contentInput: {
    padding: 20,
    fontSize: 16,
    color: "#334155",
    lineHeight: 24,
    minHeight: 300,
  },
});