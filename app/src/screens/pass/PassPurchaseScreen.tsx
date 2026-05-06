import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import KSPayService from "../../services/payment/KSPayService";

// 💡 total_count 타입을 추가하여 TS 에러를 방지합니다.
interface PackageOption {
  id: string;
  label: string;
  price: number;
  total_count?: number;
}
interface Package {
  id: string;
  name: string;
  description: string;
  category_id: string;
  is_consult: boolean;
  price?: number;
  total_count?: number; // 💡 total_sessions 대신 이것을 사용하거나 둘 다 정의
  duration_in_days?: number;
  weekly_limit?: number;
  package_options: PackageOption[];
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === 0) return "상담 요망";
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
};

export default function PassPurchaseScreen({ navigation }: any) {
  const [selectedBranchId, setSelectedBranchId] = useState<
    "branch_1" | "branch_2"
  >("branch_1");
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("regular");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [selectedCountIndex, setSelectedCountIndex] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showKSPay, setShowKSPay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [addShuttle, setAddShuttle] = useState(false);
  const [addJelly, setAddJelly] = useState(false);
  const [isClassAssigned, setIsClassAssigned] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [branchContact, setBranchContact] = useState({ phone: "", kakao: "" });

  useEffect(() => {
    fetchInitialData();
    fetchCategoriesFromDB(true); // 지점 변경 시에만 'true' 전달하여 첫 탭으로 초기화
  }, [selectedBranchId]);

  useEffect(() => {
    if (activeCategory) {
      fetchPackagesFromDB();
    }
  }, [activeCategory, selectedBranchId]);

  const fetchCategoriesFromDB = async (shouldReset: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("package_categories")
        .select("*")
        .eq("branch_id", selectedBranchId)
        .order("display_order", { ascending: true });

      if (error) throw error;

      setCategories(data || []);
      // shouldReset이 true일 때만 첫 번째 카테고리 선택
      if (shouldReset && data && data.length > 0) {
        setActiveCategory(data[0].id);
      }
    } catch (e) {
      console.error("카테고리 로드 실패:", e);
    }
  };

  const fetchInitialData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
      const { data: children } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", user.id);
      if (children && children.length > 0) setSelectedChild(children[0]);

      const isAdultAssigned =
        profile?.target_class && String(profile.target_class).trim() !== "";
      const isChildAssigned = children?.some(
        (child: any) =>
          child.target_class && String(child.target_class).trim() !== "",
      );
      setIsClassAssigned(!!(isAdultAssigned || isChildAssigned));
    }
  };

  const fetchPackagesFromDB = async () => {
    setLoading(true);
    try {
      const { data: branchData } = await supabase
        .from("branches")
        .select("phone_number, kakao_link")
        .eq("id", selectedBranchId)
        .single();
      if (branchData) {
        setBranchContact({
          phone: branchData.phone_number || "",
          kakao: branchData.kakao_link || "",
        });
      }
      const { data, error } = await supabase
        .from("packages")
        .select(`*, package_options (*)`)
        .eq("branch_id", selectedBranchId)
        .eq("category_id", activeCategory)
        .order("display_order", { ascending: true });
      if (error) throw error;
      setPackages(data || []);
      if (data && data.length > 0) {
        setSelectedMainId(data[0].id);
        setSelectedCountIndex(0);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const processCompletePayment = async (payKey: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(
        "https://pgdev.ksnet.co.kr/store/KSPayMobileV1.4/web_host/recv_jpost.jsp",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `sndCommConId=${payKey}&sndAmount=${finalPrice}&sndActionType=1&sndCharSet=UTF-8`,
        },
      );

      if (response.ok) {
        const expiryDate = new Date();
        expiryDate.setDate(
          expiryDate.getDate() + (currentSelection?.duration_in_days || 30),
        );

        // 💡 핵심 수정 1: 선택한 옵션(칩)에서 정확한 횟수(total_count)를 꺼내옵니다.
        const targetOption =
          currentSelection?.package_options?.[selectedCountIndex];
        const optionTotalCount = targetOption?.total_count || 10;

        // 💡 핵심 수정 2: DB 저장 (컬럼명 일치 및 정확한 횟수 삽입)
        const { error: dbError } = await supabase.from("user_packages").insert([
          {
            user_id: currentUser.id,
            package_id: selectedMainId,
            package_name: `${currentSelection?.name} (${targetOption?.label || "기본"})`, // 예: 정규반 (10회)

            // 🛠️ 팀원 코드의 total_sessions를 우리가 바꾼 total_count로 수정!
            total_count: optionTotalCount,
            remaining_count: optionTotalCount,

            expiry_date: expiryDate.toISOString(),
            branch_id: selectedBranchId,
            child_id: selectedChild ? selectedChild.id : null,
            child_name: selectedChild ? selectedChild.child_name : "본인",
            price: finalPrice,
            status: "active",
          },
        ]);

        if (dbError) throw dbError;
        navigation.replace("PurchaseSuccess");
      } else {
        throw new Error("결제 승인 응답 실패");
      }
    } catch (e: any) {
      console.error(e);
      // ✅ [수정] 실패 시에도 전용 실패 페이지로 보냅니다.
      // Alert보다는 실패 페이지에서 "다시 시도"를 유도하는 것이 흐름상 좋습니다.
      navigation.replace("PurchaseFail");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseKSPay = (success: boolean, payKey?: string) => {
    setShowKSPay(false);
    if (success && payKey) {
      setTimeout(() => {
        processCompletePayment(payKey);
      }, 600);
    }
  };

  const handleCall = async () => {
    setShowConsultModal(false);
    if (currentUser) {
      try {
        await supabase.from("consultation_requests").insert({
          user_id: currentUser.id,
          branch_id: selectedBranchId,
          request_type: "PHONE",
          status: "PENDING",
        });
      } catch (error) {
        console.error("상담 내역 저장 에러:", error);
      }
    }
    Linking.openURL(`tel:${branchContact.phone || "010-0000-0000"}`);
  };

  const handleKakao = async () => {
    setShowConsultModal(false);
    if (currentUser) {
      try {
        await supabase.from("consultation_requests").insert({
          user_id: currentUser.id,
          branch_id: selectedBranchId,
          request_type: "KAKAO",
          status: "PENDING",
        });
      } catch (error) {
        console.error("상담 내역 저장 에러:", error);
      }
    }
    Linking.openURL(branchContact.kakao || "https://pf.kakao.com/_xxxxxx");
  };

  const currentSelection = packages.find((p) => p.id === selectedMainId);
  const basePrice = currentSelection?.is_consult
    ? 0
    : currentSelection?.package_options &&
        currentSelection.package_options.length > 0
      ? currentSelection.package_options[selectedCountIndex].price
      : currentSelection?.price || 0;

  const finalPrice =
    basePrice + (addShuttle ? 14000 : 0) + (addJelly ? 39600 : 0);

  const handleOpenPayment = () => {
    if (!selectedChild && !currentUser) {
      Alert.alert(
        "알림",
        "사용자 정보를 불러올 수 없습니다. 다시 시도해주세요.",
      );
      return;
    }
    setShowOptionModal(false);
    setShowKSPay(true);
  };

  const isDeveloper = currentUser?.role === "admin";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        {isDeveloper ? (
          <TouchableOpacity
            style={styles.branchSwitcher}
            onPress={() =>
              setSelectedBranchId(
                selectedBranchId === "branch_1" ? "branch_2" : "branch_1",
              )
            }
          >
            <Text style={styles.headerTitle}>
              {selectedBranchId === "branch_1" ? "시흥본점" : "영종도점"} 이용권
            </Text>
            <Ionicons
              name="swap-horizontal"
              size={16}
              color="#6366F1"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.branchStatic}>
            <Text style={styles.headerTitle}>
              {selectedBranchId === "branch_1" ? "시흥본점" : "영종도점"} 이용권
            </Text>
          </View>
        )}
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🚀 변경 포인트 5: DB 카테고리 데이터로 탭 렌더링 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
          contentContainerStyle={styles.tabScrollContent} // 스타일 연결
        >
          {categories.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeCategory === tab.id && styles.activeTab,
              ]}
              onPress={() => setActiveCategory(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeCategory === tab.id && styles.activeTabText,
                ]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.mainPadding}>
          <View style={styles.eventBanner}>
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>EVENT</Text>
            </View>
            <Text style={styles.eventText}>선착순 50명 가입비 면제 혜택!</Text>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#6366F1"
              style={{ marginTop: 50 }}
            />
          ) : packages.length > 0 ? (
            packages.map((item) => {
              const isSelected = selectedMainId === item.id;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.packageCard,
                    isSelected && styles.selectedCard,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => {
                      setSelectedMainId(item.id);
                      setSelectedCountIndex(0);
                    }}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.activeRadio,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.packageSubDesc}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {isSelected && !item.is_consult && (
                    <View style={styles.optionContainer}>
                      <View style={styles.chipRow}>
                        {item.package_options?.map((opt, idx) => (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.chip,
                              selectedCountIndex === idx && styles.activeChip,
                            ]}
                            onPress={() => setSelectedCountIndex(idx)}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                selectedCountIndex === idx &&
                                  styles.activeChipText,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.priceValue}>
                        {formatCurrency(
                          item.package_options[selectedCountIndex]?.price ||
                            item.price ||
                            0,
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                해당 분류의 상품이 준비 중입니다.
              </Text>
            </View>
          )}

          <View style={styles.bottomInfo}>
            <Text style={styles.infoTitle}>📌 꼭 확인해주세요!</Text>
            <Text style={styles.infoItem}>
              • 가입비 최초 1회 10만원 (유니폼+젤리 지급)
            </Text>
            <Text style={styles.infoItem}>
              • 모든 수업료는 부가세 별도 금액입니다.
            </Text>
            <Text style={styles.infoItem}>
              • 카드사 할인 및 할부는 결제창에서 확인 가능합니다.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.floatingFooter}>
        <View style={styles.footerPriceBox}>
          <Text style={styles.footerLabel}>선택 금액</Text>
          <Text style={styles.footerPrice}>
            {currentSelection?.is_consult
              ? "상담 대기"
              : formatCurrency(basePrice)}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.mainActionBtn,
            currentSelection?.is_consult && styles.consultActionBtn,
          ]}
          onPress={() => {
            if (currentSelection?.is_consult) {
              Linking.openURL(`tel:${branchContact.phone || "010-0000-0000"}`);
            } else if (!isClassAssigned) {
              setShowConsultModal(true);
            } else {
              setShowOptionModal(true);
            }
          }}
        >
          <Text style={styles.mainActionText}>
            {currentSelection?.is_consult ? "상담 전화하기" : "결제하기"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showConsultModal} transparent animationType="fade">
        <View style={styles.consultModalOverlay}>
          <View style={styles.consultModalContent}>
            <View style={styles.consultModalIconBg}>
              <Ionicons name="chatbubbles" size={32} color="#6366F1" />
            </View>
            <Text style={styles.consultModalTitle}>상담이 필요합니다!</Text>
            <Text style={styles.consultModalDesc}>
              첫 수강생은 원활한 수업을 위해{"\n"}반 배정 상담 후 결제가
              가능합니다.
            </Text>
            <View style={styles.consultModalBtnContainer}>
              <TouchableOpacity
                style={styles.consultKakaoBtn}
                onPress={handleKakao}
              >
                <Ionicons
                  name="chatbubble"
                  size={20}
                  color="#111827"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.consultKakaoText}>카카오톡 문의</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.consultCallBtn}
                onPress={handleCall}
              >
                <Ionicons
                  name="call"
                  size={20}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.consultCallText}>전화 상담</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.consultCloseBtn}
              onPress={() => setShowConsultModal(false)}
            >
              <Text style={styles.consultCloseBtnText}>나중에 할게요</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showOptionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>추가 옵션 선택</Text>
              <TouchableOpacity onPress={() => setShowOptionModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.optionList}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setAddShuttle(!addShuttle)}
              >
                <Ionicons
                  name={addShuttle ? "checkbox" : "square-outline"}
                  size={24}
                  color={addShuttle ? "#6366F1" : "#D1D5DB"}
                />
                <Text style={styles.optionName}>
                  유료 셔틀버스 신청 (+14,000원)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setAddJelly(!addJelly)}
              >
                <Ionicons
                  name={addJelly ? "checkbox" : "square-outline"}
                  size={24}
                  color={addJelly ? "#6366F1" : "#D1D5DB"}
                />
                <Text style={styles.optionName}>키즈젤리 단품 (+39,600원)</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalFooter}>
              <View style={styles.modalPriceBox}>
                <Text style={styles.modalPriceValue}>
                  {formatCurrency(finalPrice)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.finalPayBtn}
                onPress={handleOpenPayment}
              >
                <Text style={styles.finalPayBtnText}>최종 결제 진행</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showKSPay && currentUser && (
        <KSPayService
          isVisible={showKSPay}
          onClose={handleCloseKSPay}
          paymentData={{
            amount: finalPrice,
            packageName: `${currentSelection?.name} (${currentSelection?.package_options[selectedCountIndex]?.label || "기본"})`,
            userName: currentUser.name,
            userPhone: currentUser.phone || "01000000000",
            packageId: selectedMainId || "",
            userId: currentUser.id,
            childId: selectedChild ? selectedChild.id : null,
            childName: selectedChild ? selectedChild.child_name : "본인",
            // 💡 DB 컬럼명에 맞춰 totalCount라는 Key로 전송합니다.
            totalCount:
              currentSelection?.package_options[selectedCountIndex]
                ?.total_count || 10,
            durationInDays: currentSelection?.duration_in_days || 30,
            weeklyLimit: currentSelection?.weekly_limit || 2,
            branchId: selectedBranchId,
            branchName:
              selectedBranchId === "branch_1" ? "시흥본점" : "영종도점",
            storeId: "2999199999",
          }}
        />
      )}

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.processingText}>
            결제 승인을 처리 중입니다...
          </Text>
        </View>
      )}
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
  branchSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  branchStatic: { paddingHorizontal: 12, paddingVertical: 6 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tabScrollContent: {
    paddingHorizontal: 20,
    paddingRight: 50, // 마지막 아이템 오른쪽 치우침 해결
    alignItems: "center",
  },
  tab: {
    marginRight: 20,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: "#6366F1" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#94A3B8" },
  activeTabText: { color: "#111827", fontWeight: "800" },
  scrollContent: { paddingBottom: 140 },
  mainPadding: { padding: 20 },
  eventBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1B4B",
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  eventBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 10,
  },
  eventBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  eventText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  packageCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  selectedCard: { borderColor: "#6366F1", borderWidth: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activeRadio: { borderColor: "#6366F1" },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#6366F1",
  },
  packageName: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  packageSubDesc: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  optionContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeChip: { backgroundColor: "#1E1B4B", borderColor: "#1E1B4B" },
  chipText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  activeChipText: { color: "#FFF" },
  priceValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textAlign: "right",
  },
  bottomInfo: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  infoItem: { fontSize: 12, color: "#64748B", marginBottom: 6, lineHeight: 18 },
  floatingFooter: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerPriceBox: { flex: 1 },
  footerLabel: { color: "#94A3B8", fontSize: 10 },
  footerPrice: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  mainActionBtn: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
  },
  consultActionBtn: { backgroundColor: "#10B981" },
  mainActionText: { color: "#FFF", fontSize: 15, fontWeight: "800" },

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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  optionList: { marginBottom: 30 },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  optionName: { marginLeft: 10, fontSize: 15 },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  modalPriceBox: { flex: 1 },
  modalPriceValue: { fontSize: 20, fontWeight: "bold" },
  finalPayBtn: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 16,
  },
  finalPayBtnText: { color: "#FFF", fontWeight: "bold" },

  consultModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  consultModalContent: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  consultModalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  consultModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  consultModalDesc: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  consultModalBtnContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  consultKakaoBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FEE500",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  consultKakaoText: { color: "#111827", fontSize: 15, fontWeight: "700" },
  consultCallBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  consultCallText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  consultCloseBtn: { paddingVertical: 10 },
  consultCloseBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  processingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  emptyContainer: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
});
