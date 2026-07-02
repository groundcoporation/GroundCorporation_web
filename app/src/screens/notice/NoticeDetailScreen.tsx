import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert, // 🚀 [추가] 삭제 확인 알림창을 띄우기 위해 추가
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// 🚀 [추가] DB에서 공지사항을 삭제하기 위해 Supabase 클라이언트 임포트
import { supabase } from "../../lib/supabase";
// 🚀 [추가] 학부모가 수정 버튼을 못 누르게 권한을 확인하기 위해 useAuth 임포트
import { useAuth } from "../../context/AuthContext";

export default function NoticeDetailScreen({ route, navigation }: any) {
  // 🚀 [리팩토링 완료] 전역 상태에서 직원(isStaff) 확인 스위치 가져오기!
  // 우리가 AuthContext에서 만든 isStaff는 role === 'admin' || role === 'coach' 일 때만 true가 됩니다!
  const { isStaff } = useAuth();

  // 이전 화면(NoticeListScreen)에서 넘겨준 공지사항 데이터를 받습니다.
  const { notice } = route.params; 

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  // 🚀 [추가] 공지사항 삭제 함수
  const handleDelete = () => {
    // 1. 실수로 지우지 않도록 경고 알림창을 먼저 띄웁니다.
    Alert.alert(
      "공지사항 삭제",
      "정말로 이 공지사항을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive", // iOS에서 글씨를 빨간색으로 만들어 주의를 줍니다.
          onPress: async () => {
            try {
              // 2. Supabase DB의 'notices' 테이블에서 현재 글의 id와 일치하는 것을 지웁니다.
              const { error } = await supabase
                .from("notices")
                .delete()
                .eq("id", notice.id);

              if (error) throw error;

              Alert.alert("성공", "공지사항이 성공적으로 삭제되었습니다.");
              // 3. 삭제가 완료되면 목록 화면으로 돌아갑니다.
              navigation.goBack();
            } catch (error) {
              console.error("공지사항 삭제 에러:", error);
              Alert.alert("오류", "공지사항 삭제 중 문제가 발생했습니다.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. 상단 앱바 */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        
        <Text style={styles.appBarTitle}>공지사항</Text>
        
        {/* 💡 기존의 빈 View를 지우고, [수정] 버튼으로 교체했습니다! */}
        {/* 🚀 [적용] 직원(isStaff) 스위치가 켜진 경우(admin 또는 coach)에만 수정 버튼 노출! */}
        {isStaff ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={() => navigation.navigate("NoticeEdit", { notice })}
              style={styles.iconButton}
            >
              <Ionicons name="create-outline" size={26} color="#111827" />
            </TouchableOpacity>
            
            {/* 🚀 [추가] 쓰레기통(삭제) 아이콘 버튼 */}
            <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={26} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 26 }} /> /* 레이아웃 균형을 위한 빈 공간 */
        )}
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 2. 공지사항 헤더 (제목 및 날짜) */}
        <View style={styles.headerSection}>
          {notice.is_important && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>중요</Text>
            </View>
          )}
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.date}>{formatDate(notice.created_at)}</Text>
        </View>

        <View style={styles.divider} />

        {/* 3. 공지사항 본문 내용 */}
        <View style={styles.contentSection}>
          <Text style={styles.content}>{notice.content}</Text>
        </View>
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
  // 🚀 [추가] 수정 및 삭제 버튼을 가로로 가지런히 정렬하기 위한 스타일
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 16, // 버튼 사이의 간격을 줍니다.
  },
  container: { flex: 1 },
  headerSection: { padding: 24 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: { color: "#EF4444", fontSize: 12, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "700", color: "#1E293B", lineHeight: 32, marginBottom: 12 },
  date: { fontSize: 13, color: "#94A3B8" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 24 },
  contentSection: { padding: 24, paddingBottom: 60 },
  content: { fontSize: 16, color: "#475569", lineHeight: 26 },
});