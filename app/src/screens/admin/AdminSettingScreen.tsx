import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function AdminPackageScreen() {
  // --- 데이터 상태 ---
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 패키지 상세 모달 상태 ---
  const [isPkgListModalVisible, setIsPkgListModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);

  // --- 추가/수정용 모달 상태 ---
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [isPkgFormVisible, setIsPkgFormVisible] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);

  const [catForm, setCatForm] = useState({ name: "", display_order: "1" });
  const [pkgForm, setPkgForm] = useState({
    name: "",
    description: "", // 상품 상세 설명
    price: "",
    total_count: "",
    display_order: "1",
    is_consult: false,
  });

  // 🚀 1. 초기 로드
  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) fetchCategories();
  }, [selectedBranch]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .neq("id", "unassigned")
      .order("display_order", { ascending: true });
    if (data && data.length > 0) {
      setBranches(data);
      setSelectedBranch(data[0].id);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("package_categories")
      .select("*")
      .eq("branch_id", selectedBranch)
      .order("display_order", { ascending: true });
    setCategories(data || []);
    setLoading(false);
  };

  const fetchPackages = async (categoryId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("packages")
      .select("*, package_options(*)")
      .eq("category_id", categoryId)
      .order("display_order", { ascending: true });
    setPackages(data || []);
    setLoading(false);
  };

  const openPackageList = (category: any) => {
    setSelectedCategory(category);
    setIsPkgListModalVisible(true);
    fetchPackages(category.id);
  };

  // 🚀 2. 카테고리 저장 로직
  const handleSaveCategory = async () => {
    if (!catForm.name) return Alert.alert("알림", "분류명을 입력해주세요.");
    setLoading(true);

    const generatedId =
      catForm.name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const payload = {
      id: generatedId,
      name: catForm.name,
      display_order: parseInt(catForm.display_order),
      branch_id: selectedBranch,
    };

    const { error } = await supabase
      .from("package_categories")
      .insert([payload]);
    if (error) Alert.alert("오류", `카테고리 저장 실패: ${error.message}`);
    else {
      setIsCatModalVisible(false);
      setCatForm({ name: "", display_order: "1" });
      fetchCategories();
    }
    setLoading(false);
  };

  // 🚀 3. 패키지 저장 및 수정 로직 (Description 포함)
  const handleSavePackage = async () => {
    if (!pkgForm.name) return Alert.alert("알림", "상품명을 입력해주세요.");
    setLoading(true);

    try {
      const pkgPayload = {
        category_id: selectedCategory.id,
        branch_id: selectedBranch,
        name: pkgForm.name,
        description: pkgForm.description, // DB description 컬럼 연동
        display_order: parseInt(pkgForm.display_order),
        is_consult: pkgForm.is_consult,
      };

      let pkgId = editingPkgId;
      if (editingPkgId) {
        await supabase
          .from("packages")
          .update(pkgPayload)
          .eq("id", editingPkgId);
      } else {
        const { data } = await supabase
          .from("packages")
          .insert([pkgPayload])
          .select()
          .single();
        pkgId = data.id;
      }

      const optPayload = {
        package_id: pkgId,
        branch_id: selectedBranch,
        label: pkgForm.name,
        price: parseInt(pkgForm.price) || 0,
        total_count: parseInt(pkgForm.total_count) || 0,
      };

      if (editingPkgId) {
        await supabase
          .from("package_options")
          .update(optPayload)
          .eq("package_id", pkgId);
      } else {
        await supabase.from("package_options").insert([optPayload]);
      }

      setIsPkgFormVisible(false);
      fetchPackages(selectedCategory.id);
    } catch (e) {
      Alert.alert("오류", "상품 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const openEditPkg = (item: any) => {
    const opt = item.package_options?.[0] || {};
    setPkgForm({
      name: item.name,
      description: item.description || "",
      price: String(opt.price || ""),
      total_count: String(opt.total_count || ""),
      display_order: String(item.display_order),
      is_consult: item.is_consult,
    });
    setEditingPkgId(item.id);
    setIsPkgFormVisible(true);
  };

  const currentBranch = branches.find((b) => b.id === selectedBranch);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* --- 헤더 --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>PRODUCT SETTINGS</Text>
          <Text style={styles.headerTitle}>
            🏫 {currentBranch?.name || "로딩 중..."}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.branchToggle}
          onPress={() => {
            const idx = branches.findIndex((b) => b.id === selectedBranch);
            setSelectedBranch(branches[(idx + 1) % branches.length].id);
          }}
        >
          <Ionicons name="swap-horizontal" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* --- 📂 카테고리 메인 리스트 --- */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.catCard}
            onPress={() => openPackageList(item)}
          >
            <View style={styles.catIconBox}>
              <Ionicons name="folder-open" size={24} color="#6366F1" />
            </View>
            <View style={styles.catInfo}>
              <Text style={styles.catName}>{item.name}</Text>
              <Text style={styles.catSub}>터치하여 포함된 패키지 확인</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        )}
        onRefresh={fetchCategories}
        refreshing={loading}
      />

      {/* 카테고리 추가 FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsCatModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* --- 📦 패키지 리스트 모달 --- */}
      <Modal
        visible={isPkgListModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPkgListModalVisible(false)}
      >
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSubtitle}>
                CATEGORY: {selectedCategory?.name}
              </Text>
              <Text style={styles.modalTitle}>상품 목록</Text>
            </View>
            <TouchableOpacity onPress={() => setIsPkgListModalVisible(false)}>
              <Ionicons name="close-circle" size={32} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={packages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <View style={styles.pkgCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pkgName}>{item.name}</Text>
                  <Text style={styles.pkgDesc} numberOfLines={2}>
                    {item.description || "설명 없음"}
                  </Text>
                  <Text style={styles.pkgPrice}>
                    {item.package_options?.[0]?.price?.toLocaleString()}원 /{" "}
                    {item.package_options?.[0]?.total_count}회
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditPkg(item)}
                >
                  <Text style={styles.editBtnText}>수정</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>등록된 상품이 없습니다.</Text>
              </View>
            }
          />
          <TouchableOpacity
            style={styles.modalBottomBtn}
            onPress={() => {
              setEditingPkgId(null);
              setPkgForm({
                name: "",
                description: "",
                price: "",
                total_count: "",
                display_order: "1",
                is_consult: false,
              });
              setIsPkgFormVisible(true);
            }}
          >
            <Text style={styles.modalBottomBtnText}>
              + 이 분류에 새 상품 추가
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* --- 📝 패키지 입력/수정 모달 (Description 추가) --- */}
      <Modal visible={isPkgFormVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.alertModal}
          >
            <View style={styles.alertHeader}>
              <Text style={styles.alertTitle}>
                {editingPkgId ? "상품 수정" : "새 상품 등록"}
              </Text>
              <TouchableOpacity onPress={() => setIsPkgFormVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>상품 명</Text>
              <TextInput
                style={styles.input}
                value={pkgForm.name}
                onChangeText={(t) => setPkgForm({ ...pkgForm, name: t })}
                placeholder="예: [특가] 주 2회 정규반"
              />

              <Text style={styles.label}>상세 설명</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                multiline
                value={pkgForm.description}
                onChangeText={(t) => setPkgForm({ ...pkgForm, description: t })}
                placeholder="앱에 노출될 상세 내용을 입력하세요 (예: 1:1 밀착 코칭)"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>가격 (원)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={pkgForm.price}
                    onChangeText={(t) => setPkgForm({ ...pkgForm, price: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>총 횟수 (회)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={pkgForm.total_count}
                    onChangeText={(t) =>
                      setPkgForm({ ...pkgForm, total_count: t })
                    }
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSavePackage}
              >
                <Text style={styles.submitBtnText}>데이터베이스 저장</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- 🛠 카테고리 추가 팝업 모달 --- */}
      <Modal visible={isCatModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.alertModal}>
            <Text style={styles.alertTitle}>새 분류 추가</Text>
            <Text style={styles.label}>분류 명칭</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 정규 수강권"
              value={catForm.name}
              onChangeText={(t) => setCatForm({ ...catForm, name: t })}
            />
            <View style={styles.alertBtnRow}>
              <TouchableOpacity
                onPress={() => setIsCatModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCategory}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
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
    padding: 24,
    backgroundColor: "#FFF",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#6366F1",
    fontWeight: "900",
    letterSpacing: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#1E293B" },
  branchToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: { padding: 20 },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    elevation: 2,
  },
  catIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  catInfo: { flex: 1 },
  catName: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  catSub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  modalFull: { flex: 1, backgroundColor: "#FFF" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalSubtitle: {
    fontSize: 10,
    color: "#6366F1",
    fontWeight: "900",
    letterSpacing: 1,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  pkgCard: {
    backgroundColor: "#F8FAFC",
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    marginHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  pkgName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  pkgDesc: { fontSize: 13, color: "#94A3B8", marginTop: 4, marginBottom: 6 },
  pkgPrice: { fontSize: 14, fontWeight: "700", color: "#6366F1" },
  editBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  editBtnText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  modalBottomBtn: {
    margin: 24,
    backgroundColor: "#1E1B4B",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
  },
  modalBottomBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertModal: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 28,
    maxHeight: "80%",
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  alertTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
  },
  alertBtnRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 16, alignItems: "center" },
  cancelBtnText: { fontWeight: "700", color: "#94A3B8" },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#1E1B4B",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFF", fontWeight: "800" },
  submitBtn: {
    backgroundColor: "#1E1B4B",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  row: { flexDirection: "row" },
  emptyBox: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#CBD5E1", fontWeight: "700", textAlign: "center" },
});
