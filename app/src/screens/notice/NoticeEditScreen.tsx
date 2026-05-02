import React, { useState } from "react";
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

export default function NoticeEditScreen({ route, navigation }: any) {
  // 이전 화면에서 notice 데이터를 넘겨받았다면 '수정' 모드
  const existingNotice = route.params?.notice;
  const isEditing = !!existingNotice;

  const [title, setTitle] = useState(existingNotice?.title || "");
  const [content, setContent] = useState(existingNotice?.content || "");
  const [isImportant, setIsImportant] = useState(existingNotice?.is_important || false);
  const [isOnHome, setIsOnHome] = useState(existingNotice?.is_on_home || false); // 💡 새로 추가된 홈 노출 설정
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("알림", "제목과 내용을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 1. 현재 로그인한 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      
      // 2. DB에 넣을 데이터 포맷팅
      const noticeData = {
        title,
        content,
        is_important: isImportant,
        is_on_home: isOnHome,
        // 💡 아래 정보들은 나중에 users 테이블과 연동해서 동적으로 가져오면 더 좋습니다.
        author_id: user?.id || null, 
        author_name: "관리자", // 임시 고정
        author_badge: "대표",  // 임시 고정
        branch_id: null,       // 일단 NULL을 넣어서 '전체 공지'로 처리
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        // [수정 로직]
        const { error } = await supabase
          .from("notices")
          .update(noticeData)
          .eq("id", existingNotice.id);
          
        if (error) throw error;
      } else {
        // [새 글 작성 로직]
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
      
      {/* 헤더 */}
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

        {/* 💡 홈 화면 노출 스위치 (새로 추가됨) */}
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