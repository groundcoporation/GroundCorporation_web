import React, { useState, useEffect, useMemo } from "react";
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
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// 🚀 공통 이벤트 배너 컴포넌트 임포트 (중복 제거의 핵심)
import EventBanner from "../../components/EventBanner";

// 🚀 푸시 알림 발송 함수 임포트
import { sendGlobalPushNotification } from "../../services/notificationService";

// 🚀 전역 상태 보관소에서 useAuth 훅 임포트
import { useAuth } from "../../context/AuthContext";

// --- 인터페이스 정의 ---
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
  is_option?: boolean;
  display_order?: number;
  price?: number;
  total_count?: number;
  duration_in_days?: number;
  weekly_limit?: number;
  is_shuttle?: boolean;
  package_options: PackageOption[];
}
interface CartItem {
  uniqueId: string;
  pkg: Package;
  optIndex: number;
  quantity: number;
}

interface Parent {
  id: string;
  name: string;
  phone: string;
  branch_id?: string;
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === 0) return "0원";
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
};

export default function AdminBillingScreen({ route, navigation }: any) {
  const { branchId, role, setBranch } = useAuth();
  const insets = useSafeAreaInsets();

  // --- 상태 관리 ---
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("regular");
  const [packages, setPackages] = useState<Package[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [selectedCountIndex, setSelectedCountIndex] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentBranch, setCurrentBranch] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 💡 [중복 제거] 하드코딩 배너 제어용 banners, activeBannerIndex 상태 및 레퍼런스 전체 삭제

  // 학부모 선택 및 검색 관련 상태
  const [parents, setParents] = useState<Parent[]>([]);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [showParentModal, setShowParentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const preSelectedParent = route.params?.preSelectedParent;

  // --- 초기 데이터 로딩 ---
  useEffect(() => {
    if (!branchId) return;

    fetchInitialData();
    fetchCategoriesFromDB(true);
    fetchParents();
  }, [branchId]);

  useEffect(() => {
    if (activeCategory && branchId) {
      fetchPackagesFromDB();
    }
  }, [activeCategory, branchId]);

  useEffect(() => {
    if (preSelectedParent) {
      setSelectedParent(preSelectedParent);
      console.log(
        "🎯 [Billing] 상담 화면으로부터 자동 선택된 학부모:",
        preSelectedParent.name,
      );
    }
  }, [preSelectedParent]);

  const fetchParents = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, phone, branch_id")
        .eq("branch_id", branchId);

      if (!error && data) setParents(data);
      else console.error("[Billing] ❌ 학부모 목록 로드 에러:", error);
    } catch (e) {
      console.error("[Billing] ❌ 학부모 목록 로드 실패:", e);
    }
  };

  const fetchCategoriesFromDB = async (shouldReset: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("package_categories")
        .select("*")
        .eq("branch_id", branchId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      if (shouldReset && data && data.length > 0) {
        setActiveCategory(data[0].id);
      }
    } catch (e) {
      console.error("[Purchase] ❌ 카테고리 로드 실패:", e);
    }
  };

  const fetchInitialData = async () => {
    try {
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
      }
    } catch (e) {
      console.error("[Purchase] ❌ 초기 데이터 로드 실패:", e);
    }
  };

  const fetchPackagesFromDB = async () => {
    setLoading(true);
    try {
      const { data: branchData } = await supabase
        .from("branches")
        .select("*")
        .eq("id", branchId)
        .single();

      if (branchData) {
        console.log("[Purchase] 🔍 DB에서 가져온 MID:", branchData.kspay_mid);
        setCurrentBranch(branchData);
      }

      const { data, error } = await supabase
        .from("packages")
        .select(`*, package_options (*)`)
        .eq("branch_id", branchId)
        .order("display_order", { ascending: true, nullsFirst: false });

      if (error) throw error;
      const sortedData = (data || []).sort(
        (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999),
      );
      setAllPackages(sortedData);
      const displayPackages = sortedData.filter(
        (p) => p.category_id === activeCategory,
      );
      setPackages(displayPackages);

      if (displayPackages.length > 0) {
        setSelectedMainId(displayPackages[0].id);
        setSelectedCountIndex(0);
      }
    } catch (e) {
      console.error("[Purchase] ❌ 패키지 로드 중 예외 발생:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!selectedParent)
      return Alert.alert("알림", "청구서를 받을 학부모님을 선택해주세요.");
    if (cartItems.length === 0)
      return Alert.alert("알림", "상품을 담아주세요.");
    if (!currentUser)
      return Alert.alert("알림", "관리자 정보를 불러올 수 없습니다.");

    Alert.alert(
      "청구서 발송",
      `${selectedParent.name} 학부모님께 총 ${formatCurrency(finalPrice)} 청구서를 발송하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "발송하기",
          onPress: async () => {
            setIsProcessing(true);
            try {
              const orderNo = `REQ-${Date.now()}`;

              const { error: dbError } = await supabase
                .from("payment_requests")
                .insert([
                  {
                    order_no: orderNo,
                    parent_id: selectedParent.id,
                    parent_name: selectedParent.name,
                    sender_id: currentUser.id,
                    sender_name: currentUser.name,
                    branch_id: branchId,
                    total_amount: finalPrice,
                    cart_items: cartItems,
                    status: "pending",
                  },
                ]);

              if (dbError) throw dbError;

              try {
                await sendGlobalPushNotification({
                  targetBranchId: null,
                  targetUserId: selectedParent.id,
                  title: `💳 이용권 결제 요청`,
                  body: `코치님이 보낸 이용권 청구서(${formatCurrency(finalPrice)})가 도착했습니다.`,
                  type: "payment",
                });
              } catch (pushError) {
                console.log("[Billing] ⚠️ 푸시 알림 발송 중 에러:", pushError);
              }

              Alert.alert("성공", "청구서가 성공적으로 발송되었습니다!");
              setCartItems([]);
              setSelectedParent(null);
              setIsCartExpanded(false);
              setShowOptionModal(false);
            } catch (error) {
              console.error("[Billing] ❌ 청구서 발송 에러:", error);
              Alert.alert("오류", "청구서 발송에 실패했습니다.");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  const addToCart = (pkg: Package, optIndex: number) => {
    console.log(`[Cart] 🛒 아이템 추가: ${pkg.name}`);
    const existingIndex = cartItems.findIndex(
      (c) => c.pkg.id === pkg.id && c.optIndex === optIndex,
    );
    if (existingIndex !== -1) {
      const newCart = [...cartItems];
      newCart[existingIndex].quantity += 1;
      setCartItems(newCart);
    } else {
      setCartItems([
        ...cartItems,
        {
          uniqueId: Date.now().toString() + Math.random(),
          pkg,
          optIndex,
          quantity: 1,
        },
      ]);
    }
    setIsCartExpanded(true);
  };

  const updateQuantity = (uniqueId: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.uniqueId === uniqueId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeCartItem = (uniqueId: string) => {
    setCartItems((prev) => {
      const filtered = prev.filter((c) => c.uniqueId !== uniqueId);
      if (filtered.length === 0) setIsCartExpanded(false);
      return filtered;
    });
  };

  const finalPrice = cartItems.reduce((sum, cartItem) => {
    const p =
      cartItem.pkg.package_options?.[cartItem.optIndex]?.price ||
      cartItem.pkg.price ||
      0;
    return sum + p * cartItem.quantity;
  }, 0);

  const totalCartCount = cartItems.reduce((acc, c) => acc + c.quantity, 0);
  const popupOptions = allPackages.filter(
    (p) => p.is_option && !cartItems.some((cart) => cart.pkg.id === p.id),
  );

  const handleOpenPayment = () => {
    if (cartItems.length === 0)
      return Alert.alert("알림", "상품을 담아주세요.");
    if (!selectedParent)
      return Alert.alert("알림", "청구서를 받을 학부모님을 선택해주세요.");
    setShowOptionModal(false);
    handleSendInvoice();
  };

  const isDeveloper = role === "admin" || currentUser?.role === "admin";

  const filteredParents = parents.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    const phoneClean = p.phone ? p.phone.replace(/-/g, "") : "";
    const searchPhoneClean = searchQuery.replace(/-/g, "");
    return (
      p.name.toLowerCase().includes(searchLower) ||
      phoneClean.includes(searchPhoneClean)
    );
  });

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
              setBranch(branchId === "branch_1" ? "branch_2" : "branch_1")
            }
          >
            <Text style={styles.headerTitle}>
              {branchId === "branch_1" ? "시흥본점" : "영종도점"} 청구서 발행
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
              {currentBranch?.name || "지점"} 청구서 발행
            </Text>
          </View>
        )}
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isCartExpanded && cartItems.length > 0 ? 400 : 160 },
        ]}
      >
        <TouchableOpacity
          style={styles.parentSelectBox}
          onPress={() => {
            setSearchQuery("");
            setShowParentModal(true);
          }}
        >
          <View>
            <Text style={styles.parentSelectLabel}>
              결제 요청 대상 (학부모)
            </Text>
            <Text
              style={
                selectedParent
                  ? styles.parentSelectedText
                  : styles.parentPlaceholderText
              }
            >
              {selectedParent
                ? `${selectedParent.name} 학부모님`
                : "여기를 눌러 대상을 선택해주세요"}
            </Text>
          </View>
          <Ionicons name="search" size={24} color="#64748B" />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
          contentContainerStyle={styles.tabScrollContent}
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
          {/* 🚀 [수정] 중복 청소된 자리에 고정형 공통 이벤트 배너 연동 */}
          <EventBanner
            screenType="purchase"
            branchId={branchId}
            marginHorizontal={0} // 메인 패딩 레이아웃 틀에 균일하게 밀착
          />

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#6366F1"
              style={{ marginTop: 50 }}
            />
          ) : packages.length > 0 ? (
            packages.map((item) => {
              const isSelected = selectedMainId === item.id;
              const isInCart = cartItems.some((c) => c.pkg.id === item.id);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.packageCard,
                    (isSelected || isInCart) && styles.selectedCard,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => {
                      setSelectedMainId(item.id);
                      setSelectedCountIndex(0);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.packageSubDesc}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {isSelected && (
                    <View style={styles.optionContainer}>
                      {!item.is_consult ? (
                        <>
                          <View style={styles.chipRow}>
                            {item.package_options?.map((opt, idx) => (
                              <TouchableOpacity
                                key={opt.id}
                                style={[
                                  styles.chip,
                                  selectedCountIndex === idx &&
                                    styles.activeChip,
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
                          <View style={styles.priceRow}>
                            <Text style={styles.priceValue}>
                              {formatCurrency(
                                item.package_options[selectedCountIndex]
                                  ?.price ||
                                  item.price ||
                                  0,
                              )}
                            </Text>
                            <TouchableOpacity
                              style={styles.addCartBtn}
                              onPress={() =>
                                addToCart(item, selectedCountIndex)
                              }
                            >
                              <Text style={styles.addCartBtnText}>
                                장바구니 담기
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceValue}>상담 후 결제</Text>
                          <TouchableOpacity
                            style={styles.addCartBtn}
                            onPress={() => addToCart(item, 0)}
                          >
                            <Text style={styles.addCartBtnText}>담기</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>상품 준비 중입니다.</Text>
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

      <View
        style={[
          styles.integratedFooterWrapper,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <TouchableOpacity
          style={styles.cartToggleHeader}
          onPress={() =>
            cartItems.length > 0 && setIsCartExpanded(!isCartExpanded)
          }
          activeOpacity={0.8}
        >
          <Text style={styles.cartToggleText}>
            {cartItems.length > 0
              ? `🛒 장바구니에 ${totalCartCount}개 담김`
              : "🛒 상품을 선택해주세요"}
          </Text>
          {cartItems.length > 0 && (
            <Ionicons
              name={isCartExpanded ? "chevron-down" : "chevron-up"}
              size={20}
              color="#64748B"
            />
          )}
        </TouchableOpacity>

        {isCartExpanded && cartItems.length > 0 && (
          <View style={styles.cartListContainer}>
            <ScrollView
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={false}
            >
              {cartItems.map((cartItem) => {
                const opt = cartItem.pkg.package_options?.[cartItem.optIndex];
                const price = opt?.price || cartItem.pkg.price || 0;
                return (
                  <View key={cartItem.uniqueId} style={styles.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>
                        {cartItem.pkg.name} {opt ? `(${opt.label})` : ""}
                      </Text>
                      <Text style={styles.cartItemPrice}>
                        {formatCurrency(price * cartItem.quantity)}
                      </Text>
                    </View>
                    <View style={styles.quantityController}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(cartItem.uniqueId, -1)}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="remove" size={16} color="#64748B" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(cartItem.uniqueId, 1)}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="add" size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeCartItem(cartItem.uniqueId)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="close" size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.payBar}>
          <View style={styles.payInfoBox}>
            <Text style={styles.payInfoLabel}>청구 총액</Text>
            <Text style={styles.payInfoPrice}>
              {formatCurrency(finalPrice)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.mainActionBtn,
              cartItems.length === 0 && { backgroundColor: "#94A3B8" },
            ]}
            onPress={() => {
              if (cartItems.length === 0)
                return Alert.alert(
                  "알림",
                  "원하시는 상품에서 [담기] 버튼을 눌러주세요.",
                );
              if (popupOptions.length > 0) setShowOptionModal(true);
              else handleSendInvoice();
            }}
          >
            <Text style={styles.mainActionText}>청구서 발송</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showParentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>학부모 선택</Text>
              <TouchableOpacity onPress={() => setShowParentModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#94A3B8"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="이름 또는 전화번호로 검색"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={true}
            >
              {filteredParents.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.parentListItem}
                  onPress={() => {
                    setSelectedParent(p);
                    setShowParentModal(false);
                  }}
                >
                  <Text style={styles.parentListName}>{p.name} 학부모님</Text>
                  <Text style={styles.parentListPhone}>
                    {p.phone || "연락처 미등록"}
                  </Text>
                </TouchableOpacity>
              ))}
              {filteredParents.length === 0 && (
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="search-outline" size={40} color="#E2E8F0" />
                  <Text style={styles.emptySearchText}>
                    검색된 학부모님이 없습니다.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showOptionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>추가 혜택 추천</Text>
              <TouchableOpacity onPress={() => setShowOptionModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.optionList}>
              {popupOptions.map((opt) => {
                const isChecked = cartItems.some((c) => c.pkg.id === opt.id);
                const optPrice =
                  opt.package_options?.[0]?.price || opt.price || 0;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.optionItem}
                    onPress={() =>
                      isChecked
                        ? removeCartItem(
                            cartItems.find((c) => c.pkg.id === opt.id)
                              ?.uniqueId || "",
                          )
                        : addToCart(opt, 0)
                    }
                  >
                    <Ionicons
                      name={isChecked ? "checkbox" : "square-outline"}
                      size={24}
                      color={isChecked ? "#6366F1" : "#D1D5DB"}
                    />
                    <Text style={styles.optionName}>
                      {opt.name} (+{formatCurrency(optPrice)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                <Text style={styles.finalPayBtnText}>최종 청구서 발송</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.processingText}>요청을 처리 중입니다...</Text>
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
  parentSelectBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  parentSelectLabel: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "700",
    marginBottom: 4,
  },
  parentSelectedText: { fontSize: 16, fontWeight: "800", color: "#1E1B4B" },
  parentPlaceholderText: { fontSize: 15, fontWeight: "600", color: "#94A3B8" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tabScrollContent: {
    paddingHorizontal: 20,
    paddingRight: 50,
    alignItems: "center",
  },
  tab: {
    marginRight: 20,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: "#6366F1" },

  // 💡 [중복 제거 완료] bannerWrapper, adBanner, adTag, bannerDotRow 스타일 파편 완전 파쇄

  tabText: { fontSize: 15, fontWeight: "600", color: "#94A3B8" },
  activeTabText: { color: "#111827", fontWeight: "800" },
  scrollContent: {},
  mainPadding: { padding: 20 },
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
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  priceValue: { fontSize: 22, fontWeight: "900", color: "#111827" },
  addCartBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addCartBtnText: { color: "#4F46E5", fontWeight: "800", fontSize: 14 },
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
  integratedFooterWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  cartToggleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cartToggleText: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cartListContainer: { marginTop: 10, marginBottom: 20 },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  cartItemName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cartItemPrice: {
    fontSize: 14,
    color: "#6366F1",
    marginTop: 4,
    fontWeight: "700",
  },
  quantityController: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginRight: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyBtn: { padding: 4 },
  qtyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 12,
  },
  deleteBtn: { padding: 4 },
  payBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  payInfoBox: { flex: 1 },
  payInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  payInfoPrice: { fontSize: 22, fontWeight: "900", color: "#111827" },
  mainActionBtn: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
  },
  consultActionBtn: { backgroundColor: "#10B981" },
  mainActionText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B", padding: 0 },
  emptySearchContainer: { paddingVertical: 40, alignItems: "center" },
  emptySearchText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  parentListItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  parentListName: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  parentListPhone: { fontSize: 14, color: "#94A3B8", marginTop: 4 },
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
