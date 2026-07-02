import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useNavigation } from "@react-navigation/native"; // 🚀 [추가] 상세페이지 이동을 위한 네비게이션 훅 임포트

const { width } = Dimensions.get("window");

export default function NotificationBell() {
  const navigation = useNavigation<any>(); // 🚀 [추가] 네비게이션 사용 선언
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // 1. 유저 ID가 없으면 초기화만 하고 리턴
    if (!currentUserId) {
      getUserIdAndInit();
      return;
    }

    // 2. 이 이펙트 턴에서 사용할 일회용 해제 플래그
    let isCleanedUp = false;
    let activeChannel: any = null;

    console.log(`🔔 [알림 종] 실시간 채널 구독 시도... (${currentUserId})`);

    // 3. 무조건 고유한 무작위 ID를 채널명 뒤에 붙여서 이전 채널과 완전히 격리시킵니다.
    // 이렇게 하면 이전 채널이 삭제 중이더라도 절대 충돌이 나지 않습니다.
    const uniqueChannelName = `bell_realtime:${currentUserId}:${Math.random().toString(36).substring(7)}`;

    const channel = supabase.channel(uniqueChannelName).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUserId}`,
      },
      () => {
        // 클린업이 이미 일어났다면 이벤트를 무시합니다.
        if (isCleanedUp) return;

        console.log(
          "🔔 [알림 종 실시간 감지] 배지 카운트와 리스트를 즉시 동기화합니다.",
        );
        fetchUnreadCount(currentUserId);
        reloadNotificationsOnly();
      },
    );

    // 4. 안전하게 설정을 마친 후 subscribe를 호출하고 변수에 할당합니다.
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        activeChannel = channel;
        // subscribe 성공 직후 혹시 모를 클린업 타이밍 체크
        if (isCleanedUp && activeChannel) {
          supabase.removeChannel(activeChannel);
        }
      }
    });

    // 5. 클린업 함수
    return () => {
      console.log(`🔔 [알림 종] 실시간 채널 구독 해제 요청 (${currentUserId})`);
      isCleanedUp = true;

      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      } else {
        // 아직 subscribe 프로세스 중일 때를 대비해 생성된 인스턴스 자체를 날림
        supabase.removeChannel(channel);
      }
    };
  }, [currentUserId]);
  const getUserIdAndInit = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      fetchUnreadCount(user.id);
      // 🚀 앱 실행 시 1주일 지난 알림 자동 청소
      cleanOldNotifications(user.id);
    }
  };

  // 🚀 [신규] 7일 지난 알림 자동 삭제 로직
  const cleanOldNotifications = async (userId: string) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .lt("created_at", sevenDaysAgo.toISOString());
  };

  const fetchUnreadCount = async (userId?: string) => {
    const id = userId || currentUserId;
    if (!id) return;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id)
      .eq("is_read", false);

    if (!error) setUnreadCount(count || 0);
  };

  const openNotificationModal = async () => {
    if (!currentUserId) return;
    setModalVisible(true);
    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) setNotifications(data || []);
    setLoading(false); // 🚀 [🔥 복구 완료] loading || setLoading(false) 로직을 깔끔하게 정상 복구했습니다.
  };

  // 🚀 [추가] 실시간 백그라운드 갱신 전용 함수 (화면이 깜빡거리는 로딩 가림창 없이 리스트 데이터만 자연스럽게 밀어 넣어 줍니다)
  const reloadNotificationsOnly = async () => {
    if (!currentUserId) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) setNotifications(data || []);
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications(notifications.filter((n) => n.id !== id));
      fetchUnreadCount();
    }
  };

  // 🚀 [추가] 알림 개별 클릭 시 읽음 처리 기능 추가
  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      fetchUnreadCount();
    }
  };

  // 🚀 [전체 삭제 기능 원상복구]
  const deleteAllNotifications = async () => {
    if (!currentUserId) return;

    Alert.alert("알림 삭제", "모든 알림 내역을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", currentUserId);

          if (!error) {
            setNotifications([]);
            setUnreadCount(0);
          }
        },
      },
    ]);
  };

  // 🚀 [🔥 버그 수정] 모두 읽음 시 데이터가 증발하던 동기화 로직 전면 수정
  const markAllAsRead = async () => {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    if (!error) {
      setUnreadCount(0);
      // 기존 내역을 지우지 않고, 배열 내 모든 아이템들의 읽음 여부(is_read)만 true로 완벽 변환하여 유지시킵니다!
      setNotifications((prevNotis) =>
        prevNotis.map((n) => ({ ...n, is_read: true })),
      );
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={openNotificationModal} style={styles.bellBtn}>
        <Ionicons name="notifications-outline" size={24} color="#111827" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              {/* 🚀 [오타 수정 완료] styles.dropdownContainer 로 정상 지정 */}
              <View style={styles.dropdownContainer}>
                {/* 🚀 삼각형 위치: 58에서 62로 수정하여 살짝 더 왼쪽으로 이동 */}
                <View style={styles.triangle} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>최근 알림</Text>
                  <View style={{ flexDirection: "row" }}>
                    {/* 🚀 팀장님 요청: 전체 삭제를 왼쪽으로 배치 */}
                    <TouchableOpacity
                      onPress={deleteAllNotifications}
                      style={{ marginRight: 12 }}
                    >
                      <Text
                        style={[styles.headerActionText, { color: "#EF4444" }]}
                      >
                        전체 삭제
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={markAllAsRead}>
                      <Text style={styles.headerActionText}>모두 읽음</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {loading ? (
                  <ActivityIndicator
                    color="#6366F1"
                    style={{ marginVertical: 30 }}
                  />
                ) : notifications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      새로운 알림이 없습니다.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 350 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {notifications.map((item) => (
                      /* 🚀 [수정] 단순 View였던 알림 행을 터치 가능한 TouchableOpacity로 변경하고 경우의 수 분기 처리! */
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.notiItem,
                          !item.is_read && styles.unreadNoti,
                        ]}
                        activeOpacity={0.7}
                        onPress={async () => {
                          setModalVisible(false); // 1. 모달 팝업 닫기
                          markAsRead(item.id); // 2. 알림 읽음 처리

                          // =======================================================================================
                          // 💡 [본부장님 기획구역 주석 보강] 알림 종류(type)에 따라 원하는 전역 스크린 화면으로 네비게이션 전환 처리!
                          // =======================================================================================
                          if (item.type === "notice" && item.notice_id) {
                            // 📢 [공지사항 알림 터치 시]
                            // 🚀 [수정] SQL로 새로 생성한 notice_id 방의 값을 꺼내어 notices 테이블에서 진짜 원본 공지글을 1건 실시간 조회합니다.
                            try {
                              const { data: realNotice } = await supabase
                                .from("notices")
                                .select("*")
                                .eq("id", item.notice_id)
                                .single();

                              if (realNotice) {
                                // 가져온 진짜 공지글 데이터 덩어리(realNotice)를 파라미터로 실어 상세 화면("NoticeDetail")으로 완벽히 점프시킵니다.
                                navigation.navigate("NoticeDetail", {
                                  notice: realNotice,
                                });
                                return;
                              }
                            } catch (err) {
                              console.log("공지글 상세 데이터 조회 실패:", err);
                            }

                            // 💡 안전용 백업 폴백: 글 데이터 호출에 실패한 경우 공지 리스트로 안전하게 안내합니다.
                            navigation.navigate("NoticeList");
                          } else if (item.type === "payment") {
                            // 💳 [결제 관련 알림 터치 시]
                            // 결제 영수증이나 청구 확인 내역으로 즉시 보낼 수 있도록 마이페이지("MyPage")로 라우팅을 넘깁니다.
                            navigation.navigate("MyPage");
                          } else if (item.type === "attendance") {
                            // 🚌 [출결 및 등하원 알림 터치 시]
                            // 등하원 픽업 버스 상태를 부모가 확인할 수 있도록 출석확인 스크린("Attendance")으로 네비게이션을 넘깁니다.
                            navigation.navigate("Attendance");
                          }
                          // =======================================================================================
                        }}
                      >
                        <View style={styles.notiContent}>
                          <Text style={styles.notiTitle}>{item.title}</Text>
                          <Text style={styles.notiMessage} numberOfLines={2}>
                            {item.message}
                          </Text>
                          <Text style={styles.notiDate}>
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteNotification(item.id)}
                          style={styles.deleteBtn}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#D1D5DB"
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bellBtn: { padding: 4 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  badgeText: { color: "#FFF", fontSize: 8, fontWeight: "900" },
  modalOverlay: { flex: 1, backgroundColor: "transparent" },
  dropdownContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 65,
    right: 15,
    width: width * 0.85,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  triangle: {
    position: "absolute",
    top: -8,
    right: 67,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  headerActionText: { fontSize: 11, color: "#6366F1", fontWeight: "700" },
  notiItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    alignItems: "center",
  },
  unreadNoti: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  notiContent: { flex: 1 },
  notiTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  notiMessage: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 4,
  },
  notiDate: { fontSize: 10, color: "#94A3B8" },
  deleteBtn: { padding: 8, marginLeft: 5 },
  emptyContainer: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 13 },
});
