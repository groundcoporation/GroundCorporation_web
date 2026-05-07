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

const { width } = Dimensions.get("window");

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getUserIdAndInit();
    
    // 🚀 실시간 알림 구독
    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchUnreadCount(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUserIdAndInit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
    setLoading(false);
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications(notifications.filter(n => n.id !== id));
      fetchUnreadCount();
    }
  };

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
        }
      }
    ]);
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    if (!error) {
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={openNotificationModal} style={styles.bellBtn}>
        <Ionicons name="notifications-outline" size={24} color="#111827" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownContainer}>
                {/* 🚀 삼각형 위치: 58에서 62로 수정하여 살짝 더 왼쪽으로 이동 */}
                <View style={styles.triangle} />
                
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>최근 알림</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {/* 🚀 팀장님 요청: 전체 삭제를 왼쪽으로 배치 */}
                    <TouchableOpacity onPress={deleteAllNotifications} style={{ marginRight: 12 }}>
                      <Text style={[styles.headerActionText, { color: '#EF4444' }]}>전체 삭제</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={markAllAsRead}>
                      <Text style={styles.headerActionText}>모두 읽음</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {loading ? (
                  <ActivityIndicator color="#6366F1" style={{ marginVertical: 30 }} />
                ) : notifications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>새로운 알림이 없습니다.</Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
                    {notifications.map((item) => (
                      <View key={item.id} style={[styles.notiItem, !item.is_read && styles.unreadNoti]}>
                        <View style={styles.notiContent}>
                          <Text style={styles.notiTitle}>{item.title}</Text>
                          <Text style={styles.notiMessage} numberOfLines={2}>{item.message}</Text>
                          <Text style={styles.notiDate}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => deleteNotification(item.id)}
                          style={styles.deleteBtn}
                        >
                          <Ionicons name="trash-outline" size={16} color="#D1D5DB" />
                        </TouchableOpacity>
                      </View>
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
    top: Platform.OS === 'ios' ? 100 : 65, 
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
    // 🚀 삼각형 위치: 팀장님 요청대로 살짝 더 왼쪽(62)으로 수정
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
  unreadNoti: { backgroundColor: "#F9FAFB", borderRadius: 10, paddingHorizontal: 8 },
  notiContent: { flex: 1 },
  notiTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  notiMessage: { fontSize: 12, color: "#64748B", lineHeight: 16, marginBottom: 4 },
  notiDate: { fontSize: 10, color: "#94A3B8" },
  deleteBtn: { padding: 8, marginLeft: 5 },
  emptyContainer: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 13 },
});