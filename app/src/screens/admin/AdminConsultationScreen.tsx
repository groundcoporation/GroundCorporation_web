import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal, // 🚀 [추가] 드롭다운용 모달
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext"; // 🚀 [추가] 지점 정보를 가져오기 위해 추가

export default function AdminConsultationScreen({ navigation }: any) {
  const { branchId } = useAuth(); // 🚀 [추가] 현재 관리자의 지점 ID
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 [수정] 성인(user_id) 혹은 자녀(child_id)를 키값으로 반 배정 상태를 저장합니다.
  const [targetClasses, setTargetClasses] = useState<{ [key: string]: string }>(
    {},
  );

  // 🚀 [추가] 반 배정 모달 관련 상태
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [showClassModal, setShowClassModal] = useState(false);

  // 🚀 [수정] 유저 ID뿐만 아니라 자녀 ID도 담을 수 있도록 이름 변경
  const [currentSelectingId, setCurrentSelectingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    fetchRequests();
    if (branchId) {
      fetchClasses(); // 🚀 지점이 확인되면 반 목록도 가져옵니다.
    }
  }, [branchId]);

  // 🚀 [추가] DB에서 현재 지점의 개설된 '반 목록' 가져오기
  const fetchClasses = async () => {
    try {
      // 1. class_schedules 테이블에서 해당 지점의 target_class만 전부 가져옴
      const { data, error } = await supabase
        .from("class_schedules")
        .select("target_class")
        .eq("branch_id", branchId);

      if (!error && data) {
        // 2. 🚀 중복 제거 (예: '초등부'가 월/수/금 3개 있어도 1개로 합침)
        // Set 객체를 이용해 중복을 없앤 후 다시 배열로 변환합니다.
        const uniqueClasses = Array.from(
          new Set(data.map((item) => item.target_class)),
        );

        // 3. 기존 모달 UI({ id, name })와 에러 없이 호환되도록 형태를 변환
        const formattedClasses = uniqueClasses
          .filter(Boolean) // 혹시 모를 null이나 빈 칸 방지
          .map((className) => ({
            id: className,
            name: className,
          }));

        setAvailableClasses(formattedClasses);
      }
    } catch (e) {
      console.log("반 목록 로드 에러:", e);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // 🚀 상담 요청과 유저 정보를 한 번에 가져옴 (아이디 추적)
      const { data: requestData, error } = await supabase
        .from("consultation_requests")
        .select(
          `
          *,
          user:users (
            name,
            phone,
            email
          )
        `,
        )
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (requestData && requestData.length > 0) {
        const userIds = requestData.map((req) => req.user_id);

        // 🚀 [추가] 해당 학부모들의 '자녀 목록'을 가져옵니다.
        const { data: childrenData } = await supabase
          .from("children")
          .select("*")
          .in("parent_id", userIds);

        // 🚀 [추가] 상담 데이터 안에 자녀 목록을 매핑해줍니다.
        const requestsWithChildren = requestData.map((req) => ({
          ...req,
          children:
            childrenData?.filter((c) => c.parent_id === req.user_id) || [],
        }));

        setRequests(requestsWithChildren);
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.log(e);
      Alert.alert("에러", "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 [수정] 자녀 목록(children)도 함께 받아서 처리하도록 파라미터 추가
  const handleComplete = async (
    requestId: string,
    userId: string,
    reqUser: any,
    children: any[],
  ) => {
    const isAdult = children.length === 0;

    // 🛑 유효성 검사: 배정할 반을 모두 선택했는지 체크
    if (isAdult) {
      if (!targetClasses[userId] || targetClasses[userId].trim() === "") {
        Alert.alert("알림", "배정할 반을 선택해주세요.");
        return;
      }
    } else {
      for (const child of children) {
        if (!targetClasses[child.id] || targetClasses[child.id].trim() === "") {
          Alert.alert(
            "알림",
            `${child.child_name} 학생의 배정할 반을 선택해주세요.`,
          );
          return;
        }
      }
    }

    try {
      // 1. 유저 테이블의 target_class 업데이트 (결제 락 해제 핵심 로직)
      // 🚀 [수정] 성인이면 users 테이블, 자녀면 children 테이블을 업데이트합니다.
      if (isAdult) {
        const { error: userError } = await supabase
          .from("users")
          .update({ target_class: targetClasses[userId] })
          .eq("id", userId);
        if (userError) throw userError;
      } else {
        for (const child of children) {
          const { error: childError } = await supabase
            .from("children")
            .update({ target_class: targetClasses[child.id] })
            .eq("id", child.id);
          if (childError) throw childError;
        }
      }

      // 2. 상담 요청 상태를 COMPLETED로 변경
      const { error: requestError } = await supabase
        .from("consultation_requests")
        .update({ status: "COMPLETED" })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // 🚀 [수정] 배정 완료 후, 청구서 발송 여부를 묻는 스마트 팝업!
      Alert.alert(
        "배정 완료",
        "모든 반 배정이 완료되었습니다.\n해당 학부모님께 이용권 청구서를 지금 발송하시겠습니까?",
        [
          {
            text: "나중에 할게요",
            style: "cancel",
            onPress: () => fetchRequests(), // 그냥 목록만 새로고침
          },
          {
            text: "네, 발송할게요",
            onPress: () => {
              fetchRequests(); // 목록 새로고침 후
              // 🚀 AdminBillingScreen으로 해당 학부모 정보 들고 이동!
              navigation.navigate("AdminBilling", {
                preSelectedParent: {
                  id: userId,
                  name: reqUser?.name || "이름없음",
                  phone: reqUser?.phone || "",
                },
              });
            },
          },
        ],
      );
    } catch (e) {
      console.log(e);
      Alert.alert("에러", "처리에 실패했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>신규 상담 & 반 배정</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#6366F1"
            style={{ marginTop: 50 }}
          />
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              대기 중인 상담 요청이 없습니다.
            </Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.userName}>
                  {req.user?.name || "이름없음"} 학부모님
                </Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{req.request_type}</Text>
                </View>
              </View>

              <Text style={styles.userPhone}>
                {req.user?.phone || "번호없음"}
              </Text>

              <View style={styles.divider} />

              {/* 🚀 [수정] 자녀 유무에 따라 드롭다운을 동적으로 생성합니다 */}
              {req.children.length === 0 ? (
                <View style={styles.assignRow}>
                  <Text style={styles.label}>[본인 수강] 반 배정</Text>
                  {/* 🚀 직접 입력(TextInput) 대신 모달을 띄우는 버튼으로 변경 */}
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setCurrentSelectingId(req.user_id);
                      setShowClassModal(true);
                    }}
                  >
                    <Text
                      style={
                        targetClasses[req.user_id]
                          ? styles.dropdownSelectedText
                          : styles.dropdownPlaceholder
                      }
                    >
                      {targetClasses[req.user_id] ||
                        "터치하여 배정할 반을 선택하세요"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              ) : (
                req.children.map((child: any) => (
                  <View key={child.id} style={styles.assignRow}>
                    <Text style={styles.label}>
                      🧒 {child.child_name} 학생 반 배정
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => {
                        setCurrentSelectingId(child.id);
                        setShowClassModal(true);
                      }}
                    >
                      <Text
                        style={
                          targetClasses[child.id]
                            ? styles.dropdownSelectedText
                            : styles.dropdownPlaceholder
                        }
                      >
                        {targetClasses[child.id] ||
                          "터치하여 배정할 반을 선택하세요"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <TouchableOpacity
                style={styles.completeBtn}
                // 🚀 학부모 정보와 자녀 목록을 같이 넘김
                onPress={() =>
                  handleComplete(req.id, req.user_id, req.user, req.children)
                }
              >
                <Text style={styles.completeBtnText}>
                  상담 완료 및 배정 저장
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 🚀 [추가] 반 선택 모달 창 */}
      <Modal visible={showClassModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>반 선택</Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {availableClasses.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  style={styles.classListItem}
                  onPress={() => {
                    if (currentSelectingId) {
                      setTargetClasses({
                        ...targetClasses,
                        [currentSelectingId]: cls.name,
                      });
                    }
                    setShowClassModal(false);
                  }}
                >
                  <Text style={styles.classNameText}>{cls.name}</Text>
                </TouchableOpacity>
              ))}
              {availableClasses.length === 0 && (
                <Text
                  style={{
                    textAlign: "center",
                    marginTop: 20,
                    color: "#94A3B8",
                  }}
                >
                  등록된 반이 없습니다. 설정에서 먼저 반을 추가해주세요.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  typeBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: { color: "#6366F1", fontSize: 12, fontWeight: "700" },
  userPhone: { fontSize: 14, color: "#64748B", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 16 },
  assignRow: { marginBottom: 16 }, // 🚀 [추가] 다자녀 리스트 간격을 위한 스타일
  label: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 8 },

  // 🚀 [추가/수정] 드롭다운 버튼 스타일
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  dropdownPlaceholder: { fontSize: 15, color: "#94A3B8" },
  dropdownSelectedText: { fontSize: 15, color: "#1E293B", fontWeight: "600" },

  completeBtn: {
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  completeBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#94A3B8", fontSize: 15 },

  // 🚀 [추가] 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  classListItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  classNameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
  },
});
