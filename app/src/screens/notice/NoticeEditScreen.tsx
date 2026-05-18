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
  
  // 🚀 [추가] 푸시 알림 발송 여부를 결정하는 스위치 상태 (신규 작성 시에만 활성화)
  const [isSendNotification, setIsSendNotification] = useState(false);

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
      
      // 🚀 [추가] public.users 테이블에서 이 유저의 '진짜 이름' 동적 조회하기
      let realName = "사용자";
      if (user) {
        const { data: profileData } = await supabase
          .from("users")
          .select("name")
          .eq("id", user.id)
          .maybeSingle();
        
        realName = profileData?.name || user.user_metadata?.name || user.email?.split('@')[0] || "사용자";
      }
      
      const noticeData = {
        title,
        content,
        is_important: isImportant,
        is_on_home: isOnHome,
        author_name: realName,
        author_id: user?.id || null, 
        branch_id: targetBranchId, 
        updated_at: new Date().toISOString(),
      };

      // 🚀 알림 연동을 위해 생성된 공지글의 결과 데이터를 담을 변수
      let savedNotice = existingNotice;

      if (isEditing) {
        const { error } = await supabase
          .from("notices")
          .update(noticeData)
          .eq("id", existingNotice.id);
        if (error) throw error;
      } else {
        // 🚀 [수정] .select()를 붙여서 DB에 저장된 진짜 공지글 데이터(ID 포함)를 돌려받습니다!
        const { data, error } = await supabase
          .from("notices")
          .insert([noticeData])
          .select()
          .single();
        if (error) throw error;
        savedNotice = data; // 방금 생성된 진짜 공지글 데이터 안착
      }

      // 🚀 [기능 연동] 새 공지사항 등록이면서 알림 발송 스위치가 켜진 경우 알림 데이터 일괄 주입
      // 🚀 [기능 연동] 새 공지사항 등록이면서 알림 발송 스위치가 켜진 경우 알림 데이터 일괄 주입
      if (!isEditing && isSendNotification) {
        // 💡 [본부장님 최적화 기획 적용] 유저를 긁어올 때부터 토큰 없는 유령 회원은 아예 배제합니다!
        let query = supabase.from("users").select("id");
        
        if (targetBranchId) {
          query = query.eq("branch_id", targetBranchId);
        }

        // 🎯 [핵심 추가] 푸시 토큰이 존재하는 사람(=앱 설치 및 로그인 유저)만 필터링!
        // (※ 주의: 'push_token' 부분은 본부장님 users 테이블의 실제 푸시 토큰 컬럼 이름으로 맞춰주세요. 예: expo_push_token 등)
        query = query.not("push_token", "is", null);

        let { data: targetUsers, error: userError } = await query;
        if (!targetUsers) targetUsers = [];

        // 🎯 [안전망] 테스트를 진행하는 나 자신(어드민/코치)은 무조건 포함
        if (user && !targetUsers.some((u) => u.id === user.id)) {
          targetUsers.push({ id: user.id });
        }

        if (!userError && targetUsers.length > 0) {
          const notificationRows = targetUsers.map((u) => ({
            user_id: u.id,
            title: `📢 신규 공지: ${title.trim()}`,
            message: content.trim().substring(0, 50),
            type: "notice", 
            notice_id: savedNotice?.id || null, 
            is_read: false,
            created_at: new Date().toISOString(),
          }));

          const { error: notiError } = await supabase
            .from("notifications")
            .insert(notificationRows);

          if (notiError) {
            console.log("🚨 알림 내역 생성 실패:", notiError.message);
          } else {
            console.log("🎉 [연동 성공] 앱을 설치한 진성 유저들에게 최적화 알림 발송 완료!");
          }
        }
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

        {/* 🚀 [추가] 푸시 알림 발송 스위치 (새 글을 추가할 때만 노출) */}
        {!isEditing && (
          <>
            <View style={styles.switchRow}>
              <View>
                <Text style={[styles.switchLabel, { color: "#4F46E5" }]}>Push 알림 발송</Text>
                <Text style={styles.switchSub}>등록과 동시에 대상 학부모들에게 알림을 보냅니다.</Text>
              </View>
              <Switch
                value={isSendNotification}
                onValueChange={setIsSendNotification}
                trackColor={{ false: "#E2E8F0", true: "#4F46E5" }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.divider} />
          </>
        )}

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