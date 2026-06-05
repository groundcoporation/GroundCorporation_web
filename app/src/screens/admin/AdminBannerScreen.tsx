import React, { useState, useEffect, useMemo } from "react";
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
  Dimensions,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Picker } from "@react-native-picker/picker";

const { width } = Dimensions.get("window");

const PRESET_THEMES = [
  { label: "다크 네이비", bg: "#1E293B", text: "#F8FAFC" },
  { label: "토스 블루", bg: "#EEF2FF", text: "#4F46E5" },
  { label: "퓨어 블랙", bg: "#111827", text: "#FFFFFF" },
  { label: "차콜 그레이", bg: "#334155", text: "#F1F5F9" },
  { label: "필드 그린", bg: "#F0FDF4", text: "#16A34A" },
  { label: "골드 옐로우", bg: "#FFFBEB", text: "#D97706" },
  { label: "소프트 핑크", bg: "#FEF2F2", text: "#EF4444" },
  { label: "스카이 블루", bg: "#E0F2FE", text: "#0369A1" },
  { label: "익스트림 RED", bg: "#DC2626", text: "#FFFFFF" },
  { label: "네온 오렌지", bg: "#FF6B35", text: "#FFFFFF" },
  { label: "스포츠 라임", bg: "#A3E635", text: "#1A2E05" },
  { label: "로얄 퍼플", bg: "#6D28D9", text: "#FFFFFF" },
];

export default function AdminBannerScreen({ navigation }: any) {
  const { branchId } = useAuth();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);

  const [form, setForm] = useState({
    screen_type: "home",
    title: "",
    subtitle: "",
    tag_text: "", // 🚀 새로 마이그레이션한 태그 텍스트 필드 추가
    link_url: "",
    display_order: "0",
    bg_color: "#111827",
    title_color: "#FFFFFF",
    subtitle_color: "rgba(255,255,255,0.7)",
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

    // 🚀 새로 가공한 정식 tag_text 변수 페이로드 조립 연동
    const payload = {
      screen_type: form.screen_type,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      tag_text: form.tag_text.trim() || null, // 🚀 신규 컬럼 매칭
      link_url: form.link_url.trim() || null,
      display_order: parseInt(form.display_order) || 0,
      bg_color: form.bg_color || "#111827",
      title_color: form.title_color || "#FFFFFF",
      subtitle_color: form.subtitle_color || "rgba(255,255,255,0.7)",
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      branch_id: branchId,
    };

    setLoading(true);
    let saveError;

    try {
      if (editingBanner) {
        const { error: err } = await supabase
          .from("banners")
          .update(payload)
          .eq("id", editingBanner.id);
        saveError = err;
      } else {
        const { error: err } = await supabase.from("banners").insert([payload]);
        saveError = err;
      }

      if (saveError) {
        console.error("❌ Supabase 배너 저장 실패 로그:", saveError);
        Alert.alert(
          "저장 실패 (DB 오류)",
          `코드: ${saveError.code}\n내용: ${saveError.message}\n\n*만약 컬럼이 반영되지 않은 상태라면 SQL 알림을 리로드하세요.`,
        );
      } else {
        setModalVisible(false);
        fetchBanners();
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", "시스템 예외가 인입되었습니다.");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (banner: any) => {
    setEditingBanner(banner);
    setForm({
      screen_type: banner.screen_type,
      title: banner.title,
      subtitle: banner.subtitle || "",
      tag_text: banner.tag_text || "", // 🚀 스키마 수신 동기화
      link_url: banner.link_url || "",
      display_order: String(banner.display_order),
      bg_color: banner.bg_color || "#111827",
      title_color: banner.title_color || "#FFFFFF",
      subtitle_color: banner.subtitle_color || "rgba(255,255,255,0.7)",
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>배너 대시보드</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingBanner(null);
            setForm({
              screen_type: "home",
              title: "",
              subtitle: "",
              tag_text: "",
              link_url: "",
              display_order: "0",
              bg_color: "#111827",
              title_color: "#FFFFFF",
              subtitle_color: "rgba(255,255,255,0.7)",
              image_url: "",
              is_active: true,
            });
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>신규 배너</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={banners}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bannerCard}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.colorPreviewCircle,
                { backgroundColor: item.bg_color || "#111827" },
              ]}
            />
            <View style={styles.bannerCardBody}>
              <View style={styles.badgeRow}>
                <View style={styles.screenBadge}>
                  <Text style={styles.screenBadgeText}>
                    {item.screen_type.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.orderText}>
                  가중치 {item.display_order}순위
                </Text>
              </View>
              <Text style={styles.bannerCardTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionTrashBtn}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Ionicons name="copy-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>게시 중인 배너가 없습니다.</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F1F5F9" }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingBanner ? "⚙️ 배너 세부 편집" : "✨ 프리미엄 배너 생성"}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionSectionTitle}>
              👀 유저 앱 화면 실시간 렌더링 스냅샷
            </Text>
            <View
              style={[
                styles.livePreviewContainer,
                { backgroundColor: form.bg_color },
              ]}
            >
              {/* 🚀 [미리보기 향상] 만약 이미지 링크가 있을 때 실시간 이미지 렌더 목업 지원 */}
              <ImageBackground
                source={form.image_url ? { uri: form.image_url } : undefined}
                style={styles.livePreviewContent}
              >
                {form.image_url && <View style={styles.imageDimOverlay} />}

                <View style={styles.livePreviewTextGroup}>
                  {/* 🚀 고정 EVENT 대신 신규 가공한 tag_text를 실시간 매칭 출력 */}
                  {form.screen_type !== "referral" && !!form.tag_text && (
                    <Text
                      style={[
                        styles.livePreviewTag,
                        { color: form.title_color },
                      ]}
                    >
                      {form.tag_text.toUpperCase()}
                    </Text>
                  )}
                  {form.screen_type === "referral" && (
                    <Ionicons
                      name="gift"
                      size={14}
                      color="#FF6B6B"
                      style={{ marginBottom: 4 }}
                    />
                  )}

                  {/* 🚀 똑같이 뚱뚱해지던 버그 분리 교정: 대제목과 소제목 독립 배치형 교정 */}
                  <View style={styles.textContentLayout}>
                    <Text
                      style={[
                        styles.livePreviewMainTitle,
                        { color: form.title_color },
                      ]}
                      numberOfLines={1}
                    >
                      {form.title || "메인 헤드라인 텍스트 문구"}
                    </Text>
                    {!!form.subtitle && (
                      <Text
                        style={[
                          styles.livePreviewSubTitle,
                          { color: form.subtitle_color || form.title_color },
                        ]}
                        numberOfLines={1}
                      >
                        {form.subtitle}
                      </Text>
                    )}
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={form.title_color}
                  opacity={0.8}
                />
              </ImageBackground>
            </View>

            <View style={styles.cardFormContainer}>
              <Text style={styles.label}>기본 표출 규칙</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={form.screen_type}
                  onValueChange={(val) =>
                    setForm({ ...form, screen_type: val })
                  }
                >
                  <Picker.Item
                    label="🏠 홈스크린 중앙 피드 영역"
                    value="home"
                  />
                  <Picker.Item
                    label="💳 이용권 결제 메인 상단"
                    value="purchase"
                  />
                  <Picker.Item
                    label="🎁 친구 초대 페이지 중단"
                    value="referral"
                  />
                </Picker>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.rowLabelGroup}>
                  {/* 🚀 컬럼 오염을 제거하고 tag_text 단독 전용 레이블 분할 매칭 */}
                  <Text style={styles.label}>
                    배너 상단 소형 태그 배지 (선택)
                  </Text>
                  <Text style={styles.charCount}>
                    {form.tag_text.length}/8자
                  </Text>
                </View>
                <TextInput
                  style={styles.inputField}
                  maxLength={8}
                  value={form.tag_text}
                  onChangeText={(t) => setForm({ ...form, tag_text: t })}
                  placeholder="예: EVENT, 공지, 안내, 모집중 (비워두면 숨김)"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.rowLabelGroup}>
                  <Text style={styles.label}>배너 핵심 대제목</Text>
                  <Text style={styles.charCount}>{form.title.length}/16자</Text>
                </View>
                <TextInput
                  style={styles.inputField}
                  maxLength={16}
                  value={form.title}
                  onChangeText={(t) => setForm({ ...form, title: t })}
                  placeholder="앱 배너에 노출될 메인 타이틀 문구"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.rowLabelGroup}>
                  <Text style={styles.label}>배너 하단 소제목</Text>
                  <Text style={styles.charCount}>
                    {form.subtitle.length}/26자
                  </Text>
                </View>
                <TextInput
                  style={styles.inputField}
                  maxLength={26}
                  value={form.subtitle}
                  onChangeText={(t) => setForm({ ...form, subtitle: t })}
                  placeholder="제목 하단 가이드 문구 기입"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>우선순위 노출 순서 가중치</Text>
                <TextInput
                  style={styles.inputField}
                  value={form.display_order}
                  onChangeText={(t) => setForm({ ...form, display_order: t })}
                  keyboardType="numeric"
                  placeholder="낮은 숫자 원칙 순서"
                />
              </View>
            </View>

            <View style={styles.cardFormContainer}>
              <Text style={styles.label}>백그라운드 이미지 주소 (선택)</Text>
              <TextInput
                style={styles.inputField}
                value={form.image_url}
                onChangeText={(t) => setForm({ ...form, image_url: t })}
                placeholder="https://... 이미지 주소 입력 (단색 배경보다 우선 적용)"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.cardFormContainer}>
              <Text style={styles.label}>테마 팔레트</Text>
              <View style={styles.colorPaletteGrid}>
                {PRESET_THEMES.map((theme, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.paletteChipCard,
                      { backgroundColor: theme.bg },
                      form.bg_color === theme.bg &&
                        styles.activePaletteChipCard,
                    ]}
                    onPress={() =>
                      setForm({
                        ...form,
                        bg_color: theme.bg,
                        title_color: theme.text,
                        subtitle_color: theme.text + "B3",
                      })
                    }
                  >
                    <Text
                      style={[styles.paletteChipText, { color: theme.text }]}
                    >
                      {theme.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveSubmitButton}
              onPress={handleSave}
            >
              <Text style={styles.saveSubmitButtonText}>저장</Text>
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
  backButton: { padding: 4 },
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

  listContainer: { padding: 16 },
  bannerCard: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  colorPreviewCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  bannerCardBody: { flex: 1 },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  screenBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  screenBadgeText: { fontSize: 9, color: "#4F46E5", fontWeight: "800" },
  orderText: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  bannerCardTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  actionTrashBtn: { padding: 4 },
  emptyView: { paddingVertical: 100, alignItems: "center" },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },

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
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  modalCloseBtn: { padding: 4 },
  form: { paddingHorizontal: 16, paddingTop: 14 },
  sectionSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  livePreviewContainer: {
    height: 110,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  livePreviewContent: {
    width: "100%",
    height: "100%",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  imageDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  livePreviewTextGroup: { flex: 1, zIndex: 3 },
  livePreviewTag: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  textContentLayout: { flexDirection: "column" },
  livePreviewMainTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  livePreviewSubTitle: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.85,
    fontWeight: "500",
  },

  cardFormContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formGroup: { marginTop: 14 },
  rowLabelGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  label: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 },
  charCount: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 14,
    color: "#1E293B",
  },
  textAreaField: { height: 100, textAlignVertical: "top", marginTop: 8 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },

  shortcutBand: { flexDirection: "row", gap: 6, marginBottom: 4 },
  shortcutBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  shortcutBtnText: { fontSize: 11, fontWeight: "700", color: "#475569" },

  colorPaletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  paletteChipCard: {
    paddingVertical: 12,
    borderRadius: 8,
    width: "31.3%",
    alignItems: "center",
    justifyContent: "center",
  },
  activePaletteChipCard: { borderColor: "#4F46E5", borderWidth: 3 },
  paletteChipText: { fontSize: 11, fontWeight: "800" },
  saveSubmitButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 60,
  },
  saveSubmitButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
