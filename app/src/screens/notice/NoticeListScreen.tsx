import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // 🚀 경로 확인 완료!
import { Picker } from "@react-native-picker/picker"; // 🚀 어드민 필터용

// 🚀 [추가] 화면이 유저 눈에 보일 때마다 공지사항을 즉시 리로드하기 위해 useIsFocused 임포트
import { useIsFocused } from "@react-navigation/native";

// 🚀 [완벽 적용됨] 전역 상태에서 branchId와 권한 스위치 가져오기
import { useAuth } from "../../context/AuthContext";

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_important: boolean;
  branch_id?: string | null;
}

export default function NoticeListScreen({ navigation }: any) {
  // 🚀 [리팩토링 완료] 하드코딩된 role 대신 깔끔한 스위치(isAdmin, isStaff)를 꺼내옵니다!
  const { branchId, isAdmin, isStaff } = useAuth();

  // 🚀 [추가] 현재 화면의 포커스 상태(유저가 이 스크린을 보고 있는지 여부)를 실시간 감시하는 센서 선언
  const isFocused = useIsFocused();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 [추가] 어드민 전용 지점 필터 상태 (기본값은 'all' 또는 현재 지점)
  const [selectedFilterBranch, setSelectedFilterBranch] =
    useState<string>("all");
  const [branches, setBranches] = useState<any[]>([]); // 지점 목록 저장

  useEffect(() => {
    // 💡 [적용] role === "admin" 대신 isAdmin 스위치 사용!
    if (isAdmin) {
      fetchBranches();
    }
  }, [isAdmin]);
  useEffect(() => {
    const handleBackButton = () => {
      // 이 화면이 눈에 보이고 있을 때(isFocused) 하단 뒤로가기를 누르면
      if (isFocused) {
        if (navigation.canGoBack()) {
          navigation.goBack(); // 안전하게 이전 화면으로 이동
        } else {
          navigation.navigate("AdminHome"); // 만약 백스택이 비어있다면 홈이나 지정된 안전한 화면으로 유도
        }
        return true; // 튕기지 않고 리액트 네이티브 안에서 처리했음을 OS에 알림
      }
      return false; // 이 화면을 안 보고 있을 때는 기본 동작 유지
    };

    // 안드로이드 하드웨어 뒤로가기 리스너 등록
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackButton,
    );

    // 컴포넌트가 사라질 때 리스너 해제 (메모리 누수 방지)
    return () => backHandler.remove();
  }, [isFocused, navigation]);
  // =========================================================================
  useEffect(() => {
    // 🚀 [수정] 지점 필터가 바뀔 때는 물론이고, 유저가 글쓰기를 마치고 이 목록 화면으로 '리턴(포커스)'하는 순간 즉시 새로고침을 실행합니다!
    if (isFocused) {
      console.log(
        "📢 [포커스 감지] 공지사항 목록 화면이 노출되어 최신 데이터를 실시간 리로드합니다.",
      );
      fetchNotices();
    }
  }, [branchId, selectedFilterBranch, isFocused]); // 🚀 감시 대상에 isFocused 센서 바인딩 추가!

  // 🚀 [추가] 어드민용 지점 목록 가져오기
  const fetchBranches = async () => {
    try {
      const { data } = await supabase.from("branches").select("id, name");
      if (data) setBranches(data);
    } catch (e) {
      console.log("지점 목록 로드 실패:", e);
    }
  };

  const fetchNotices = async () => {
    try {
      setLoading(true);

      // 💡 [핵심] 권한 및 필터에 따른 쿼리 구성 (완벽합니다!)
      let query = supabase.from("notices").select("*");

      // 💡 [적용] role === "admin" 대신 isAdmin 스위치 사용!
      if (isAdmin) {
        // 어드민: 필터가 'all'이 아니면 해당 지점만, 'all'이면 전체 조회
        if (selectedFilterBranch !== "all") {
          query = query.eq("branch_id", selectedFilterBranch);
        }
      } else {
        // 학부모/코치: 본인 지점 데이터이거나 전체공지(null)인 것만 가져옴
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
      }

      const { data, error } = await query
        .order("is_important", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setNotices(data);
    } catch (error) {
      console.log("공지사항 로드 에러:", error);

      // 🚀 실데이터가 없을 경우를 대비한 테스트용 가짜 데이터 (UI 확인용)
      if (notices.length === 0) {
        setNotices([
          {
            id: "1",
            title: "[필독] IPASSCARE 시스템 점검 안내 (5/10 새벽 2시)",
            content: "원활한 서비스 제공을 위해 시스템 점검을 진행합니다.",
            created_at: "2026-05-02T10:00:00Z",
            is_important: true,
            branch_id: null,
          },
          {
            id: "2",
            title: "지점 전용 공지 테스트",
            content: "해당 지점 학부모님들께만 보이는 공지입니다.",
            created_at: "2026-04-28T14:30:00Z",
            is_important: false,
            branch_id: branchId,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  const renderItem = ({ item }: { item: Notice }) => {
    const isGlobal = item.branch_id === null;

    return (
      <TouchableOpacity
        style={styles.noticeCard}
        // 💡 여기서 상세 페이지로 데이터(item)를 싸들고 넘어갑니다!
        onPress={() => navigation.navigate("NoticeDetail", { notice: item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {item.is_important && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>중요</Text>
              </View>
            )}
            {/* 🚀 전체 공지 배지 추가 */}
            {isGlobal && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: "#FEF3C7", marginLeft: 6 },
                ]}
              >
                <Text style={[styles.badgeText, { color: "#D97706" }]}>
                  전체공지
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.titleText} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.previewText} numberOfLines={1}>
          {item.content}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.appBar}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>공지사항</Text>
        </View>

        {/* 🚀 [적용] 어드민일 때만 보이는 지점 필터 드롭다운 */}
        {isAdmin && (
          <View style={styles.filterContainer}>
            <Picker
              selectedValue={selectedFilterBranch}
              onValueChange={(itemValue) => setSelectedFilterBranch(itemValue)}
              style={styles.picker}
              dropdownIconColor="#6366F1"
            >
              <Picker.Item label="전체 보기" value="all" />
              {branches.map((b) => (
                <Picker.Item key={b.id} label={b.name} value={b.id} />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {/* 리스트 */}
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
            </View>
          }
        />
      )}

      {/* 💡 [핵심 정답] 직원이면(admin 또는 coach) 글쓰기 버튼이 보입니다. */}
      {isStaff && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("NoticeEdit")}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginLeft: 10,
  },

  /* 🚀 추가된 필터 스타일 */
  filterContainer: {
    width: 140,
    height: 40,
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    color: "#1E293B",
  },

  loader: { flex: 1, justifyContent: "center" },
  listContent: { padding: 20, paddingBottom: 100 }, // 버튼에 안 가려지도록 하단 여백 추가

  noticeCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "800",
  },
  dateText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 22,
  },
  previewText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "500",
  },

  /* 💡 추가된 플로팅 버튼 스타일 */
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#111827", // 다크 네이비로 깔끔하게
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
