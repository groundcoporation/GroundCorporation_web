import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Switch, // 🚀 Switch 컴포넌트 임포트
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function AdminPackageScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  // --- 데이터 상태 ---
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 모달 상태 ---
  const [isPkgListModalVisible, setIsPkgListModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);

  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [isPkgFormVisible, setIsPkgFormVisible] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [branchPackages, setBranchPackages] = useState<any[]>([]); // 🚀 지점의 모든 상품 로드 상태 추가
  const [activeOptBundleIndex, setActiveOptBundleIndex] = useState<number | null>(null); // 🚀 옵션별 구성품 설정 인덱스 추가

  const [catForm, setCatForm] = useState({ name: "", display_order: "1" });
  const [pkgForm, setPkgForm] = useState<any>({
    name: "",
    description: "",
    display_order: "1",
    is_consult: false, // 상담 필요 여부
    is_option: false, // 🚀 [추가] 팝업 추천 여부
    is_shuttle: false, // 셔틀 여부
    is_item: false, // 🚀 [추가] 단품/일회성 여부
    is_bundle: false, // 🚀 [추가] 결합 세트 여부
    bundle_items: [], // 🚀 [추가] 결합 세트 구성품 (글로벌 백업용)
    options: [{ label: "주 1회", price: "", total_count: "1", bundle_items: [] }],
  });

  // --- 초기 로직 ---
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

  // 🚀 결합 상품 구성을 위한 현재 지점의 모든 상품을 불러오는 함수
  const fetchBranchPackages = async () => {
    const { data } = await supabase
      .from("packages")
      .select("*, package_options(*)")
      .eq("branch_id", selectedBranch)
      .order("display_order", { ascending: true });
    setBranchPackages(data || []);
  };

  const openPackageList = (category: any) => {
    setSelectedCategory(category);
    setIsPkgListModalVisible(true);
    fetchPackages(category.id);
  };

  // 지점 스왑 로직
  const toggleBranch = () => {
    if (branches.length < 2) return;
    const currentIndex = branches.findIndex((b) => b.id === selectedBranch);
    const nextIndex = (currentIndex + 1) % branches.length;
    setSelectedBranch(branches[nextIndex].id);
  };

  // --- 🚀 삭제 로직 (카테고리 & 패키지) ---

  const deleteCategory = async (catId: string, catName: string) => {
    Alert.alert(
      "분류 삭제",
      `[${catName}] 분류를 삭제하시겠습니까?\n이 분류에 속한 상품이 있으면 삭제되지 않을 수 있습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("package_categories")
              .delete()
              .eq("id", catId);
            if (error)
              Alert.alert(
                "오류",
                "삭제할 수 없습니다. 패키지 데이터가 남아있는지 확인하세요.",
              );
            else fetchCategories();
          },
        },
      ],
    );
  };

  const deletePackage = async (pkgId: string, pkgName: string) => {
    Alert.alert("상품 삭제", `[${pkgName}] 상품을 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          // package_options는 ON DELETE CASCADE 설정이 안되어 있을 경우 수동으로 지워야 할 수도 있습니다.
          await supabase
            .from("package_options")
            .delete()
            .eq("package_id", pkgId);
          const { error } = await supabase
            .from("packages")
            .delete()
            .eq("id", pkgId);

          if (error) Alert.alert("오류", "삭제에 실패했습니다.");
          else fetchPackages(selectedCategory.id);
        },
      },
    ]);
  };

  // --- 저장 및 옵션 관리 (이전과 동일) ---
  const addOptionRow = () => {
    setPkgForm({
      ...pkgForm,
      options: [...pkgForm.options, { label: "", price: "", total_count: "1", bundle_items: [] }],
    });
  };
  const removeOptionRow = (index: number) => {
    if (pkgForm.options.length === 1) return;
    const newOptions = pkgForm.options.filter((_: any, i: number) => i !== index);
    setPkgForm({ ...pkgForm, options: newOptions });
  };
  const updateOption = (index: number, field: string, value: string) => {
    const newOptions = [...pkgForm.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setPkgForm({ ...pkgForm, options: newOptions });
  };

  const handleSavePackage = async () => {
    if (!pkgForm.name) return Alert.alert("알림", "상품명을 입력해주세요.");
    setLoading(true);
    try {
      const pkgPayload: any = {
        category_id: selectedCategory.id,
        branch_id: selectedBranch,
        name: pkgForm.name,
        description: pkgForm.description,
        display_order: parseInt(pkgForm.display_order),
        is_consult: pkgForm.is_consult, // 상담 필요 여부 저장
        is_option: pkgForm.is_option, // 🚀 [추가] 팝업 노출 여부 저장
        voucher_type: pkgForm.is_bundle
          ? "bundle"
          : pkgForm.is_shuttle
            ? "shuttle"
            : pkgForm.is_item
              ? "product"
              : "lesson",
        usage_rules: pkgForm.is_bundle
          ? { bundle_items: pkgForm.bundle_items }
          : {},
      };
      let pkgId = editingPkgId;
      if (editingPkgId) {
        await supabase
          .from("packages")
          .update(pkgPayload)
          .eq("id", editingPkgId);
        await supabase
          .from("package_options")
          .delete()
          .eq("package_id", editingPkgId);
      } else {
        const { data } = await supabase
          .from("packages")
          .insert([pkgPayload])
          .select()
          .single();
        pkgId = data.id;
      }
      const optionsPayload = pkgForm.options.map((opt: any) => ({
        package_id: pkgId,
        branch_id: selectedBranch,
        label: opt.label,
        price: parseInt(opt.price) || 0,
        total_count: parseInt(opt.total_count) || 0,
        display_order: 0,
      }));

      const { data: insertedOptions, error: optError } = await supabase
        .from("package_options")
        .insert(optionsPayload)
        .select();

      if (optError) throw optError;

      // 🚀 결합 상품인 경우, 새로 생성된 옵션 UUID들과 매핑하여 packages.usage_rules를 최종 업데이트합니다.
      if (pkgForm.is_bundle && insertedOptions) {
        const optionBundles: any = {};
        insertedOptions.forEach((opt: any, index: number) => {
          const formOpt = pkgForm.options[index];
          if (formOpt) {
            optionBundles[opt.id] = formOpt.bundle_items || [];
          }
        });
        await supabase
          .from("packages")
          .update({ usage_rules: { option_bundles: optionBundles } })
          .eq("id", pkgId);
      }

      setIsPkgFormVisible(false);
      fetchPackages(selectedCategory.id);
    } catch (e) {
      Alert.alert("오류", "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!catForm.name) return Alert.alert("알림", "분류명 입력");
    const generatedId =
      catForm.name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const { error } = await supabase.from("package_categories").insert([
      {
        id: generatedId,
        name: catForm.name,
        display_order: parseInt(catForm.display_order),
        branch_id: selectedBranch,
      },
    ]);
    if (!error) {
      setIsCatModalVisible(false);
      setCatForm({ name: "", display_order: "1" });
      fetchCategories();
    }
  };

  const openEditPkg = (item: any) => {
    fetchBranchPackages(); // 결합 구성을 위해 상품 목록 로드
    setPkgForm({
      name: item.name,
      description: item.description || "",
      display_order: String(item.display_order),
      is_consult: item.is_consult || false,
      is_option: item.is_option || false, // 🚀 [추가] 팝업 노출 여부 불러오기
      is_shuttle: item.voucher_type === "shuttle",
      is_item: item.voucher_type === "product",
      is_bundle: item.voucher_type === "bundle",
      bundle_items: item.usage_rules?.bundle_items || [],
      options:
        item.package_options.length > 0
          ? item.package_options.map((o: any) => ({
              id: o.id,
              label: o.label,
              price: String(o.price),
              total_count: String(o.total_count),
              bundle_items: item.usage_rules?.option_bundles?.[o.id] || item.usage_rules?.bundle_items || [],
            }))
          : [{ label: "주 1회", price: "", total_count: "1", bundle_items: [] }],
    });
    setEditingPkgId(item.id);
    setIsPkgFormVisible(true);
  };

  const currentBranch = branches.find((b) => b.id === selectedBranch);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerSubtitle}>PRODUCT SETTINGS</Text>
          <Text style={styles.headerTitle}>🏫 {currentBranch?.name}</Text>
        </View>
        {branches.length > 1 && (
          <TouchableOpacity style={styles.branchToggle} onPress={toggleBranch}>
            <Ionicons name="swap-horizontal" size={20} color="#6366F1" />
          </TouchableOpacity>
        )}
      </View>

      {/* 📂 카테고리 리스트 (삭제 버튼 추가) */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        renderItem={({ item }) => (
          <View style={styles.catCardWrapper}>
            <TouchableOpacity
              style={styles.catCard}
              onPress={() => openPackageList(item)}
            >
              <View style={styles.catIconBox}>
                <Ionicons name="folder-open" size={24} color="#6366F1" />
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{item.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteCategory(item.id, item.name)}
              style={styles.catDeleteBtn}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => setIsCatModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* --- 📦 패키지 리스트 모달 (삭제 버튼 추가) --- */}
      <Modal
        visible={isPkgListModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPkgListModalVisible(false)} // 하드웨어 뒤로가기 지원
      >
        <SafeAreaView style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
            <TouchableOpacity onPress={() => setIsPkgListModalVisible(false)}>
              <Ionicons name="close-circle" size={32} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={packages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 24, paddingBottom: 24 + insets.bottom }}
            renderItem={({ item }) => (
              <View style={styles.pkgCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pkgName}>{item.name}</Text>
                  <Text style={styles.pkgDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
                <View style={styles.pkgActionRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEditPkg(item)}
                  >
                    <Text style={styles.editBtnText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtnSmall}
                    onPress={() => deletePackage(item.id, item.name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          <TouchableOpacity
            style={[
              styles.modalBottomBtn,
              { marginBottom: Math.max(insets.bottom + 16, 24) },
            ]}
            onPress={() => {
              fetchBranchPackages(); // 결합 구성을 위해 상품 목록 로드
              setEditingPkgId(null);
              setPkgForm({
                name: "",
                description: "",
                display_order: "1",
                is_consult: false,
                is_option: false, // 초기화
                is_shuttle: false, // 초기화
                is_item: false, // 초기화
                is_bundle: false, // 초기화
                bundle_items: [], // 초기화
                options: [{ label: "주 1회", price: "", total_count: "1", bundle_items: [] }],
              });
              setIsPkgFormVisible(true);
            }}
          >
            <Text style={styles.modalBottomBtnText}>+ 새 패키지 추가</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* --- 📝 패키지 폼 모달 --- */}
      <Modal
        visible={isPkgFormVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsPkgFormVisible(false)} // 🚀 안드로이드 뒤로가기 버튼 지원 추가!
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.alertModal,
                { paddingBottom: Math.max(insets.bottom + 20, 24), maxHeight: "90%" },
              ]}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>
                  {editingPkgId ? "상품 수정" : "새 상품 등록"}
                </Text>
                <TouchableOpacity onPress={() => setIsPkgFormVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.label}>상품 명</Text>
                <TextInput
                  style={styles.input}
                  value={pkgForm.name}
                  onChangeText={(t) => setPkgForm({ ...pkgForm, name: t })}
                />
                <Text style={styles.label}>상세 설명</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  multiline
                  value={pkgForm.description}
                  onChangeText={(t) => setPkgForm({ ...pkgForm, description: t })}
                />

                {/* 🚀 [추가] 특수 기능 3대장 스위치 UI 묶음 */}
                <View style={styles.switchGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      📞 상담 필수 여부 (상담 후 결제)
                    </Text>
                    <Switch
                      value={pkgForm.is_consult}
                      onValueChange={(val) =>
                        setPkgForm({ ...pkgForm, is_consult: val })
                      }
                      trackColor={{ false: "#E2E8F0", true: "#6366F1" }}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      🛒 결제 팝업 추천 (추가 옵션)
                    </Text>
                    <Switch
                      value={pkgForm.is_option}
                      onValueChange={(val) =>
                        setPkgForm({ ...pkgForm, is_option: val })
                      }
                      trackColor={{ false: "#E2E8F0", true: "#6366F1" }}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      🚌 셔틀버스 연동 (셔틀 이용권)
                    </Text>
                    <Switch
                      value={pkgForm.is_shuttle}
                      onValueChange={(val) =>
                        setPkgForm({
                          ...pkgForm,
                          is_shuttle: val,
                          is_item: val ? false : pkgForm.is_item, // 셔틀 활성화 시 단품은 해제
                          is_bundle: val ? false : pkgForm.is_bundle,
                        })
                      }
                      trackColor={{ false: "#E2E8F0", true: "#6366F1" }}
                    />
                  </View>
                  {/* 🚀 [추가] 단품/일회성 상품 스위치 */}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      📦 일회성 단품 상품 (수업 예약 불가)
                    </Text>
                    <Switch
                      value={pkgForm.is_item}
                      onValueChange={(val) =>
                        setPkgForm({
                          ...pkgForm,
                          is_item: val,
                          is_shuttle: val ? false : pkgForm.is_shuttle, // 단품 활성화 시 셔틀은 해제
                          is_bundle: val ? false : pkgForm.is_bundle,
                        })
                      }
                      trackColor={{ false: "#E2E8F0", true: "#6366F1" }}
                    />
                  </View>
                  {/* 🚀 [추가] 결합 세트 상품 스위치 */}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      🎁 결합 세트 상품 (여러 상품 묶음 패키지)
                    </Text>
                    <Switch
                      value={pkgForm.is_bundle}
                      onValueChange={(val) =>
                        setPkgForm({
                          ...pkgForm,
                          is_bundle: val,
                          is_shuttle: val ? false : pkgForm.is_shuttle,
                          is_item: val ? false : pkgForm.is_item,
                        })
                      }
                      trackColor={{ false: "#E2E8F0", true: "#6366F1" }}
                    />
                  </View>
                </View>



                <View style={styles.optionHeaderRow}>
                  <Text style={styles.label}>세부 옵션</Text>
                  <TouchableOpacity
                    onPress={addOptionRow}
                    style={styles.smallAddBtn}
                  >
                    <Text style={styles.smallAddBtnText}>+ 추가</Text>
                  </TouchableOpacity>
                </View>
                {pkgForm.options.map((opt: any, index: number) => (
                  <View key={index} style={styles.optionRow}>
                    <TextInput
                      style={[styles.miniInput, { flex: 2 }]}
                      value={opt.label}
                      onChangeText={(t) => updateOption(index, "label", t)}
                      placeholder="라벨"
                    />
                    <TextInput
                      style={[styles.miniInput, { flex: 3 }]}
                      keyboardType="numeric"
                      value={opt.price}
                      onChangeText={(t) => updateOption(index, "price", t)}
                      placeholder="가격"
                    />
                    <TextInput
                      style={[styles.miniInput, { flex: 1.5 }]}
                      keyboardType="numeric"
                      value={opt.total_count}
                      onChangeText={(t) => updateOption(index, "total_count", t)}
                      placeholder="횟수"
                    />
                    {pkgForm.is_bundle && (
                      <TouchableOpacity
                        onPress={() => setActiveOptBundleIndex(index)}
                        style={styles.optConfigBtn}
                      >
                        <Text style={styles.optConfigBtnText}>
                          구성 ({opt.bundle_items?.length || 0})
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => removeOptionRow(index)}>
                      <Ionicons name="remove-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSavePackage}
                >
                  <Text style={styles.submitBtnText}>저장하기</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 📦 세트 구성품 설정 서브 모달 --- */}
      <Modal
        visible={activeOptBundleIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveOptBundleIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.alertModal, { maxHeight: "70%" }]}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertTitle}>
                세트 구성품 설정 ({activeOptBundleIndex !== null ? pkgForm.options[activeOptBundleIndex]?.label : ""})
              </Text>
              <TouchableOpacity onPress={() => setActiveOptBundleIndex(null)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {activeOptBundleIndex !== null &&
                branchPackages
                  .filter((p: any) => p.id !== editingPkgId && p.voucher_type !== "bundle")
                  .map((item: any) => {
                    const optionItems = pkgForm.options[activeOptBundleIndex]?.bundle_items || [];
                    const selectedItem = optionItems.find((b: any) => b.package_id === item.id);
                    const isSelected = !!selectedItem;
                    const quantity = selectedItem ? String(selectedItem.quantity) : "";

                    const handleToggleItem = () => {
                      let newItems = [...optionItems];
                      if (isSelected) {
                        newItems = newItems.filter((b: any) => b.package_id !== item.id);
                      } else {
                        newItems.push({ package_id: item.id, quantity: 10 });
                      }
                      
                      const newOptions = [...pkgForm.options];
                      newOptions[activeOptBundleIndex] = {
                        ...newOptions[activeOptBundleIndex],
                        bundle_items: newItems,
                      };
                      setPkgForm({ ...pkgForm, options: newOptions });
                    };

                    const handleUpdateQty = (t: string) => {
                      const qtyNum = parseInt(t) || 0;
                      const newItems = optionItems.map((b: any) => {
                        if (b.package_id === item.id) {
                          return { ...b, quantity: qtyNum };
                        }
                        return b;
                      });
                      
                      const newOptions = [...pkgForm.options];
                      newOptions[activeOptBundleIndex] = {
                        ...newOptions[activeOptBundleIndex],
                        bundle_items: newItems,
                      };
                      setPkgForm({ ...pkgForm, options: newOptions });
                    };

                    return (
                      <View key={item.id} style={styles.bundleItemRow}>
                        <TouchableOpacity
                          onPress={handleToggleItem}
                          style={styles.bundleCheckboxRow}
                        >
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={20}
                            color={isSelected ? "#6366F1" : "#94A3B8"}
                          />
                          <Text style={styles.bundleItemName}>{item.name}</Text>
                        </TouchableOpacity>
                        {isSelected && (
                          <View style={styles.bundleQtyContainer}>
                            <TextInput
                              style={styles.miniQtyInput}
                              keyboardType="numeric"
                              value={quantity}
                              onChangeText={handleUpdateQty}
                              placeholder="수량"
                            />
                            <Text style={styles.bundleQtyUnit}>개/회</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
            </ScrollView>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => setActiveOptBundleIndex(null)}
            >
              <Text style={styles.submitBtnText}>설정 완료</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- 카테고리 폼 모달 --- */}
      <Modal
        visible={isCatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCatModalVisible(false)} // 🚀 안드로이드 뒤로가기 버튼 지원 추가!
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModal}>
            <Text style={styles.alertTitle}>새 분류 추가</Text>
            <TextInput
              style={styles.input}
              value={catForm.name}
              onChangeText={(t) => setCatForm({ ...catForm, name: t })}
            />
            <View style={styles.alertBtnRow}>
              <TouchableOpacity
                onPress={() => setIsCatModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCategory}
                style={styles.confirmBtn}
              >
                <Text style={{ color: "#FFF" }}>저장</Text>
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
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFF",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleBlock: { flex: 1 },
  headerSubtitle: {
    fontSize: 10,
    color: "#6366F1",
    fontWeight: "900",
    letterSpacing: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#1E293B" },
  listContent: { padding: 20 },
  catCardWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  catCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 24,
    elevation: 2,
  },
  catDeleteBtn: {
    padding: 15,
    marginLeft: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 15,
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
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  pkgCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
  },
  pkgName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  pkgDesc: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  pkgActionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  editBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  editBtnText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  deleteBtnSmall: { padding: 6 },
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
    width: "90%",
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    maxHeight: "85%",
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  alertTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
  },
  miniInput: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 13,
    marginRight: 5,
  },
  switchGroup: {
    marginTop: 15,
    backgroundColor: "#F8FAFC",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  optionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
  },
  smallAddBtn: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallAddBtnText: { fontSize: 11, fontWeight: "800", color: "#6366F1" },
  optionRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  submitBtn: {
    backgroundColor: "#1E1B4B",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 25,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  alertBtnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 15, alignItems: "center" },
  confirmBtn: {
    flex: 1,
    padding: 15,
    backgroundColor: "#1E1B4B",
    borderRadius: 12,
    alignItems: "center",
  },
  branchToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  bundleConfigSection: {
    marginTop: 15,
    backgroundColor: "#F8FAFC",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },
  bundleItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  bundleCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bundleItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginLeft: 8,
  },
  bundleQtyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniQtyInput: {
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontSize: 12,
    width: 50,
    textAlign: "center",
  },
  bundleQtyUnit: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 4,
  },
  optConfigBtn: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 5,
  },
  optConfigBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6366F1",
  },
});