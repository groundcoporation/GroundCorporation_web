import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Picker } from "@react-native-picker/picker";

export default function AdminBannerScreen({ navigation }: any) {
  const { branchId, role, setBranch } = useAuth();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);

  // 폼 상태
  const [form, setForm] = useState({
    screen_type: "home",
    title: "",
    subtitle: "",
    link_url: "",
    display_order: "0",
    bg_color: "#111827",
    title_color: "#FFFFFF",
    subtitle_color: "rgba(255,255,255,0.7)",
    content_html: "", // 🚀 HTML 필드 추가
    image_url: "",
    is_active: true,
  });

  useEffect(() => {
    fetchBanners();
  }, [branchId]);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("branch_id", branchId)
      .order("display_order", { ascending: true });

    if (!error) setBanners(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return Alert.alert("오류", "제목을 입력하세요.");

    const payload = {
      ...form,
      branch_id: branchId,
      display_order: parseInt(form.display_order) || 0,
    };

    setLoading(true);
    let error;
    if (editingBanner) {
      const { error: err } = await supabase
        .from("banners")
        .update(payload)
        .eq("id", editingBanner.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("banners").insert([payload]);
      error = err;
    }

    if (error) {
      Alert.alert("에러", "저장에 실패했습니다.");
    } else {
      setModalVisible(false);
      fetchBanners();
    }
    setLoading(false);
  };

  const openEdit = (banner: any) => {
    setEditingBanner(banner);
    setForm({
      screen_type: banner.screen_type,
      title: banner.title,
      subtitle: banner.subtitle || "",
      link_url: banner.link_url || "",
      display_order: String(banner.display_order),
      bg_color: banner.bg_color || "#111827",
      title_color: banner.title_color || "#FFFFFF",
      subtitle_color: banner.subtitle_color || "rgba(255,255,255,0.7)",
      content_html: banner.content_html || "", // 🚀 HTML 필드 로드
      image_url: banner.image_url || "",
      is_active: banner.is_active,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("삭제", "정말 삭제하시겠습니까?", [
      { text: "취소" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await supabase.from("banners").delete().eq("id", id);
          fetchBanners();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>
          배너 관리 ({branchId === "branch_1" ? "시흥" : "영종"})
        </Text>
        <TouchableOpacity
          onPress={() => {
            setEditingBanner(null);
            setForm({
              screen_type: "home",
              title: "",
              subtitle: "",
              link_url: "",
              display_order: "0",
              bg_color: "#111827",
              title_color: "#FFFFFF",
              subtitle_color: "rgba(255,255,255,0.7)",
              content_html: "",
              image_url: "",
              is_active: true,
            });
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={28} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={banners}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bannerItem}
            onPress={() => openEdit(item)}
          >
            <View style={styles.bannerInfo}>
              <Text style={styles.screenTag}>
                {item.screen_type.toUpperCase()}
              </Text>
              <Text style={styles.bannerTitle}>{item.title}</Text>
              <Text style={styles.bannerSub}>{item.subtitle}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={20} color="red" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>등록된 배너가 없습니다.</Text>
        }
      />

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingBanner ? "배너 수정" : "새 배너 등록"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.form}>
            <Text style={styles.label}>표시 화면</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.screen_type}
                onValueChange={(val) => setForm({ ...form, screen_type: val })}
              >
                <Picker.Item label="홈스크린" value="home" />
                <Picker.Item label="이용권 구매" value="purchase" />
                <Picker.Item label="추천하기" value="referral" />
              </Picker>
            </View>

            <Text style={styles.label}>배너 제목</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(t) => setForm({ ...form, title: t })}
              placeholder="메인 문구"
            />

            <Text style={styles.label}>배너 부제목</Text>
            <TextInput
              style={styles.input}
              value={form.subtitle}
              onChangeText={(t) => setForm({ ...form, subtitle: t })}
              placeholder="상세 설명 (필수 아님)"
            />

            <Text style={styles.label}>연결 URL (선택)</Text>
            <TextInput
              style={styles.input}
              value={form.link_url}
              onChangeText={(t) => setForm({ ...form, link_url: t })}
              placeholder="https://..."
            />

            <Text style={styles.label}>정렬 순서</Text>
            <TextInput
              style={styles.input}
              value={form.display_order}
              onChangeText={(t) => setForm({ ...form, display_order: t })}
              keyboardType="numeric"
            />

            <Text style={styles.label}>
              상세 내용 (HTML 형식 - 입력 시 제목/부제목 무시)
            </Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              multiline
              value={form.content_html}
              onChangeText={(t) => setForm({ ...form, content_html: t })}
              placeholder="예: <span style='color: yellow;'>이벤트</span> 내용을 입력하세요."
            />

            <Text style={styles.label}>
              배경 이미지 URL (선택 - 이미지 사용 시 배경색 무시)
            </Text>
            <TextInput
              style={styles.input}
              value={form.image_url}
              onChangeText={(t) => setForm({ ...form, image_url: t })}
              placeholder="https://... (이미지 주소)"
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>배경색 (Hex)</Text>
                <TextInput
                  style={styles.input}
                  value={form.bg_color}
                  onChangeText={(t) => setForm({ ...form, bg_color: t })}
                  placeholder="#000000"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>제목색 (Hex)</Text>
                <TextInput
                  style={styles.input}
                  value={form.title_color}
                  onChangeText={(t) => setForm({ ...form, title_color: t })}
                  placeholder="#FFFFFF"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>저장하기</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    padding: 20,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "bold" },
  bannerItem: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  bannerInfo: { flex: 1 },
  screenTag: {
    fontSize: 10,
    color: "#6366F1",
    fontWeight: "bold",
    marginBottom: 4,
  },
  bannerTitle: { fontSize: 16, fontWeight: "bold" },
  bannerSub: { fontSize: 13, color: "#666" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  form: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#334155",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  submitBtn: {
    backgroundColor: "#6366F1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
