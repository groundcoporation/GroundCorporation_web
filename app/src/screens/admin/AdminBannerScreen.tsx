import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import BannerPreview from "../../components/banners/BannerPreview";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

const BANNER_BUCKET = "gallery";

const SCREEN_TYPES = [
  { label: "홈", value: "home" },
  { label: "이용권", value: "purchase" },
  { label: "추천", value: "referral" },
];

const BANNER_TEMPLATES = [
  {
    label: "공지 안내",
    tag_text: "NOTICE",
    title: "새로운 공지사항",
    subtitle: "중요한 안내를 확인해 주세요",
    screen_type: "home",
    bg_color: "#EEF2FF",
    title_color: "#3730A3",
    subtitle_color: "#6366F1",
  },
  {
    label: "이벤트",
    tag_text: "EVENT",
    title: "특별 이벤트 진행",
    subtitle: "놓치기 아쉬운 혜택을 만나보세요",
    screen_type: "home",
    bg_color: "#FFF7ED",
    title_color: "#C2410C",
    subtitle_color: "#EA580C",
  },
  {
    label: "이용권 할인",
    tag_text: "SALE",
    title: "이용권 혜택 오픈",
    subtitle: "이번 달 특별가로 만나보세요",
    screen_type: "purchase",
    bg_color: "#ECFDF5",
    title_color: "#047857",
    subtitle_color: "#059669",
  },
  {
    label: "친구추천",
    tag_text: "GIFT",
    title: "친구와 함께 포인트",
    subtitle: "추천하고 혜택을 받아보세요",
    screen_type: "referral",
    bg_color: "#FDF2F8",
    title_color: "#BE185D",
    subtitle_color: "#DB2777",
  },
  {
    label: "긴급 안내",
    tag_text: "ALERT",
    title: "긴급 안내 확인",
    subtitle: "운영 변경사항을 확인해 주세요",
    screen_type: "home",
    bg_color: "#FEF2F2",
    title_color: "#B91C1C",
    subtitle_color: "#DC2626",
  },
];

const COLOR_PRESETS = [
  { label: "네이비", bg: "#111827", title: "#FFFFFF", sub: "#D1D5DB" },
  { label: "블루", bg: "#EEF2FF", title: "#3730A3", sub: "#6366F1" },
  { label: "그린", bg: "#ECFDF5", title: "#047857", sub: "#059669" },
  { label: "오렌지", bg: "#FFF7ED", title: "#C2410C", sub: "#EA580C" },
  { label: "핑크", bg: "#FDF2F8", title: "#BE185D", sub: "#DB2777" },
  { label: "퍼플", bg: "#F5F3FF", title: "#6D28D9", sub: "#7C3AED" },
  { label: "레드", bg: "#FEF2F2", title: "#B91C1C", sub: "#DC2626" },
  { label: "차콜", bg: "#334155", title: "#FFFFFF", sub: "#CBD5E1" },
];

const DEFAULT_FORM = {
  screen_type: "home",
  title: "",
  subtitle: "",
  tag_text: "",
  link_url: "",
  display_order: "0",
  bg_color: "#111827",
  title_color: "#FFFFFF",
  subtitle_color: "#D1D5DB",
  image_url: "",
  is_active: true,
};

export default function AdminBannerScreen({ navigation }: any) {
  const { branchId } = useAuth();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    fetchBanners();
  }, [branchId]);

  const fetchBanners = async () => {
    if (!branchId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("branch_id", branchId)
      .order("screen_type", { ascending: true })
      .order("display_order", { ascending: true });

    if (!error) setBanners(data || []);
    setLoading(false);
  };

  const resetCreateForm = () => {
    setEditingBanner(null);
    setSelectedImage(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  };

  const applyTemplate = (template: any) => {
    setForm((prev) => ({
      ...prev,
      screen_type: template.screen_type,
      tag_text: template.tag_text,
      title: template.title,
      subtitle: template.subtitle,
      bg_color: template.bg_color,
      title_color: template.title_color,
      subtitle_color: template.subtitle_color,
    }));
  };

  const applyColorPreset = (preset: any) => {
    setForm((prev) => ({
      ...prev,
      bg_color: preset.bg,
      title_color: preset.title,
      subtitle_color: preset.sub,
    }));
  };

  const pickBannerImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "권한 필요",
        "배너 이미지를 업로드하려면 사진 접근 권한이 필요합니다.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.75,
      base64: true,
    });

    if (!result.canceled && result.assets?.length) {
      setSelectedImage(result.assets[0]);
    }
  };

  const uploadSelectedImage = async () => {
    if (!selectedImage) return form.image_url.trim() || null;
    if (!branchId)
      throw new Error("지점 정보가 없어 이미지를 업로드할 수 없습니다.");
    if (!selectedImage.base64) {
      throw new Error("이미지 데이터를 읽지 못했습니다. 다시 선택해 주세요.");
    }

    const uriExt = selectedImage.uri.split(".").pop()?.toLowerCase();
    const mimeExt = selectedImage.mimeType?.split("/").pop()?.toLowerCase();
    const ext = (uriExt && uriExt.length <= 5 ? uriExt : mimeExt) || "jpg";
    const contentType = selectedImage.mimeType || `image/${ext}`;
    const fileName = `banners/${branchId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    setUploadingImage(true);
    const { error: uploadError } = await supabase.storage
      .from(BANNER_BUCKET)
      .upload(fileName, decode(selectedImage.base64), {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BANNER_BUCKET).getPublicUrl(fileName);

    return publicUrl;
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      Alert.alert("입력 필요", "배너 제목을 입력해 주세요.");
      return false;
    }

    if (form.link_url.trim() && !/^https?:\/\//.test(form.link_url.trim())) {
      Alert.alert(
        "링크 확인",
        "링크는 http:// 또는 https://로 시작해야 합니다.",
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !branchId || saving) return;

    setSaving(true);
    try {
      const uploadedImageUrl = await uploadSelectedImage();
      const payload = {
        screen_type: form.screen_type,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        tag_text: form.tag_text.trim() || null,
        link_url: form.link_url.trim() || null,
        display_order: Number.parseInt(form.display_order, 10) || 0,
        bg_color: form.bg_color,
        title_color: form.title_color,
        subtitle_color: form.subtitle_color,
        image_url: uploadedImageUrl,
        is_active: form.is_active,
        branch_id: branchId,
      };

      const { error } = editingBanner
        ? await supabase
            .from("banners")
            .update(payload)
            .eq("id", editingBanner.id)
        : await supabase.from("banners").insert([payload]);

      if (error) throw error;

      setModalVisible(false);
      setSelectedImage(null);
      await fetchBanners();
    } catch (e: any) {
      Alert.alert(
        "저장 실패",
        e.message || "배너를 저장하는 중 문제가 발생했습니다.",
      );
    } finally {
      setUploadingImage(false);
      setSaving(false);
    }
  };

  const openEdit = (banner: any) => {
    setEditingBanner(banner);
    setSelectedImage(null);
    setForm({
      screen_type: banner.screen_type || "home",
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      tag_text: banner.tag_text || "",
      link_url: banner.link_url || "",
      display_order: String(banner.display_order ?? 0),
      bg_color: banner.bg_color || "#111827",
      title_color: banner.title_color || "#FFFFFF",
      subtitle_color: banner.subtitle_color || "#D1D5DB",
      image_url: banner.image_url || "",
      is_active: banner.is_active ?? true,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("배너 삭제", "이 배너를 삭제할까요?", [
      { text: "취소", style: "cancel" },
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

  const previewImageUrl = selectedImage?.uri || form.image_url;
  const previewBanner = {
    ...form,
    image_url: previewImageUrl,
    display_order: Number.parseInt(form.display_order, 10) || 0,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>배너 관리</Text>
        <TouchableOpacity style={styles.addButton} onPress={resetCreateForm}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>새 배너</Text>
        </TouchableOpacity>
      </View>

      {loading && banners.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#4F46E5" />
          <Text style={styles.loadingText}>배너를 불러오는 중...</Text>
        </View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bannerCard}
              onPress={() => openEdit(item)}
              activeOpacity={0.8}
            >
              <View style={styles.bannerPreviewWrap}>
                <BannerPreview banner={item} disabled />
              </View>
              <View style={styles.bannerMetaRow}>
                <View style={styles.badgeRow}>
                  <View style={styles.screenBadge}>
                    <Text style={styles.screenBadgeText}>
                      {SCREEN_TYPES.find(
                        (screen) => screen.value === item.screen_type,
                      )?.label || item.screen_type}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      !item.is_active && styles.inactiveBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        !item.is_active && styles.inactiveBadgeText,
                      ]}
                    >
                      {item.is_active ? "노출 중" : "비활성"}
                    </Text>
                  </View>
                  <Text style={styles.orderText}>
                    순서 {item.display_order ?? 0}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.trashButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Ionicons name="copy-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyText}>등록된 배너가 없습니다.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>
                {editingBanner ? "EDIT BANNER" : "NEW BANNER"}
              </Text>
              <Text style={styles.modalTitle}>
                {editingBanner ? "배너 수정" : "배너 만들기"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.form}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>실제 노출 미리보기</Text>
              <BannerPreview banner={previewBanner} disabled />
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>배너 이미지</Text>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickBannerImage}
                activeOpacity={0.85}
                disabled={saving}
              >
                {previewImageUrl ? (
                  <>
                    <Image
                      source={{ uri: previewImageUrl }}
                      style={styles.selectedImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                      <Text style={styles.imageOverlayText}>이미지 변경</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={34} color="#94A3B8" />
                    <Text style={styles.placeholderTitle}>
                      배너 이미지 업로드
                    </Text>
                    <Text style={styles.placeholderSub}>
                      3:1 비율로 배너 영역에 꽉 차게 잘립니다
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {!!previewImageUrl && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setSelectedImage(null);
                    setForm((prev) => ({ ...prev, image_url: "" }));
                  }}
                  disabled={saving}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.removeImageText}>이미지 제거</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>목적 템플릿</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {BANNER_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.label}
                    style={styles.templateChip}
                    onPress={() => applyTemplate(template)}
                    disabled={saving}
                  >
                    <Text style={styles.templateChipText}>
                      {template.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>노출 위치</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={form.screen_type}
                  onValueChange={(val) =>
                    setForm({ ...form, screen_type: val })
                  }
                  enabled={!saving}
                >
                  {SCREEN_TYPES.map((screen) => (
                    <Picker.Item
                      key={screen.value}
                      label={screen.label}
                      value={screen.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.rowLabelGroup}>
                <Text style={styles.label}>상단 태그</Text>
                <Text style={styles.charCount}>{form.tag_text.length}/8</Text>
              </View>
              <TextInput
                style={styles.inputField}
                maxLength={8}
                value={form.tag_text}
                onChangeText={(t) => setForm({ ...form, tag_text: t })}
                placeholder="EVENT, NOTICE, NEW"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                editable={!saving}
              />

              <View style={styles.rowLabelGroup}>
                <Text style={styles.label}>제목</Text>
                <Text style={styles.charCount}>{form.title.length}/16</Text>
              </View>
              <TextInput
                style={styles.inputField}
                maxLength={16}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
                placeholder="배너 제목"
                placeholderTextColor="#94A3B8"
                editable={!saving}
              />

              <View style={styles.rowLabelGroup}>
                <Text style={styles.label}>보조 문구</Text>
                <Text style={styles.charCount}>{form.subtitle.length}/26</Text>
              </View>
              <TextInput
                style={styles.inputField}
                maxLength={26}
                value={form.subtitle}
                onChangeText={(t) => setForm({ ...form, subtitle: t })}
                placeholder="짧은 설명 문구"
                placeholderTextColor="#94A3B8"
                editable={!saving}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>색상 프리셋</Text>
              <View style={styles.paletteGrid}>
                {COLOR_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.paletteChip,
                      { backgroundColor: preset.bg },
                      form.bg_color === preset.bg && styles.activePaletteChip,
                    ]}
                    onPress={() => applyColorPreset(preset)}
                    disabled={saving}
                  >
                    <Text
                      style={[styles.paletteChipText, { color: preset.title }]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>고급 설정</Text>
              <Text style={styles.label}>클릭 링크</Text>
              <TextInput
                style={styles.inputField}
                value={form.link_url}
                onChangeText={(t) => setForm({ ...form, link_url: t })}
                placeholder="https://..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                editable={!saving}
              />

              <Text style={styles.label}>노출 순서</Text>
              <TextInput
                style={styles.inputField}
                value={form.display_order}
                onChangeText={(t) => setForm({ ...form, display_order: t })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
                editable={!saving}
              />

              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchTitle}>배너 활성화</Text>
                  <Text style={styles.switchSub}>
                    꺼두면 사용자 화면에 노출되지 않습니다.
                  </Text>
                </View>
                <Switch
                  value={form.is_active}
                  onValueChange={(value) =>
                    setForm({ ...form, is_active: value })
                  }
                  disabled={saving}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledSaveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator color="#FFF" />
                  <Text style={styles.saveButtonText}>
                    {uploadingImage ? "이미지 업로드 중..." : "저장 중..."}
                  </Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>저장하기</Text>
              )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  iconButton: { padding: 4 },
  title: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, color: "#64748B", fontWeight: "700" },
  listContainer: { padding: 16 },
  bannerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bannerPreviewWrap: { marginBottom: 12 },
  bannerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  screenBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 6,
  },
  screenBadgeText: { fontSize: 10, color: "#4F46E5", fontWeight: "900" },
  statusBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  inactiveBadge: { backgroundColor: "#F1F5F9" },
  statusBadgeText: { fontSize: 10, color: "#047857", fontWeight: "900" },
  inactiveBadgeText: { color: "#64748B" },
  orderText: { fontSize: 12, color: "#94A3B8", fontWeight: "700" },
  trashButton: { padding: 4 },
  emptyView: { paddingVertical: 100, alignItems: "center" },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },
  modalScreen: { flex: 1, backgroundColor: "#F1F5F9" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalEyebrow: {
    color: "#6366F1",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
  form: { flex: 1 },
  formContent: { padding: 16, paddingBottom: 60 },
  previewSection: { marginBottom: 16 },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 12,
  },
  imagePicker: {
    width: "100%", // 부모 패널 가로폭을 꽉 채우도록 설정
    aspectRatio: 3 / 1, // ImagePicker에서 크롭한 3:1 비율과 일치시킴
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  selectedImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlayText: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: 6,
  },
  imagePlaceholder: {
    flex: 1,
    width: "100%", // 플레이스홀더도 내부에서 꽉 차게
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 14,
  },
  placeholderTitle: {
    marginTop: 8,
    color: "#334155",
    fontSize: 14,
    fontWeight: "900",
  },
  placeholderSub: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  removeImageButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 6,
  },
  removeImageText: {
    marginLeft: 4,
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "800",
  },
  templateChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  templateChipText: { color: "#475569", fontSize: 13, fontWeight: "800" },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  rowLabelGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginTop: 10,
    marginBottom: 6,
  },
  charCount: { fontSize: 11, color: "#94A3B8", fontWeight: "700" },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    color: "#1E293B",
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paletteChip: {
    width: "31.3%",
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  activePaletteChip: { borderColor: "#4F46E5", borderWidth: 3 },
  paletteChipText: { fontSize: 12, fontWeight: "900" },
  switchRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchCopy: { flex: 1, paddingRight: 16 },
  switchTitle: { color: "#1E293B", fontSize: 14, fontWeight: "900" },
  switchSub: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  disabledSaveButton: { opacity: 0.75 },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
