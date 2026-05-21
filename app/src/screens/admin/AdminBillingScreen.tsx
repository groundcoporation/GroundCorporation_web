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
  TextInput, // 🚀 [추가] 검색창을 위한 TextInput 임포트
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// 🚀 [추가] 푸시 알림 발송 함수 임포트
import { sendGlobalPushNotification } from "../../services/notificationService";

// 🚀 [수정] 어드민 페이지이므로 KSPayService 임포트 제거 (결제는 학부모 앱에서 진행)
// import KSPayService from "../../services/payment/KSPayService";

// 🚀 [추가] 전역 상태 보관소에서 useAuth 훅 임포트
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
  is_shuttle?: boolean; // 🚀 [추가] 타입 정의에 셔틀 여부 추가
  package_options: PackageOption[];
}
interface CartItem {
  uniqueId: string;
  pkg: Package;
  optIndex: number;
  quantity: number;
}

// 🚀 [추가] 학부모 데이터 타입 정의
interface Parent {
  id: string;
  name: string;
  phone: string;
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === 0) return "0원";
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
};

// 🚀 [수정] 컴포넌트 이름을 AdminBillingScreen으로 변경하고, 파라미터 수신을 위해 route 추가
export default function AdminBillingScreen({ route, navigation }: any) {
  // 🚀 [수정] 기존에 수동으로 관리하던 selectedBranchId를 삭제하고 Context에서 가져옵니다.
  const { branchId, role, setBranch } = useAuth();

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
  
  // 🚀 [수정] 어드민에서는 결제창을 안 띄우므로 KSPay 관련 상태 제거/주석처리
  // const [showKSPay, setShowKSPay] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClassAssigned, setIsClassAssigned] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [branchContact, setBranchContact] = useState({ phone: "", kakao: "" });
  const [branchMid, setBranchMid] = useState<string>("");

  // 🚀 [추가] 학부모 선택 관련 상태 관리
  const [parents, setParents] = useState<Parent[]>([]);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [showParentModal, setShowParentModal] = useState(false);
  
  // 🚀 [추가] 학부모 검색어 상태 관리
  const [searchQuery, setSearchQuery] = useState("");

  // 🚀 [추가] 상담 화면 등 외부에서 라우팅으로 넘어온 preSelectedParent 파라미터 확인
  const preSelectedParent = route.params?.preSelectedParent;

  // --- 초기 데이터 로딩 ---
  useEffect(() => {
    // 🚀 branchId가 없으면 로딩 대기
    if (!branchId) return;

    fetchInitialData();
    fetchCategoriesFromDB(true);
    fetchParents(); // 🚀 [추가] 지점이 바뀔 때마다 해당 지점의 학부모 목록 불러오기
  }, [branchId]); // 🚀 의존성 배열에 branchId 적용

  useEffect(() => {
    if (activeCategory && branchId) {
      // 🚀 branchId 추가
      fetchPackagesFromDB();
    }
  }, [activeCategory, branchId]); // 🚀 의존성 배열에 branchId 적용

  // 🚀 [추가] 다른 화면(예: 상담화면)에서 자동 선택 요청 파라미터가 인입되었을 때 처리하는 Effect
  useEffect(() => {
    if (preSelectedParent) {
      setSelectedParent(preSelectedParent);
      console.log("🎯 [Billing] 상담 화면으로부터 자동 선택된 학부모:", preSelectedParent.name);
    }
  }, [preSelectedParent]);

  // 🚀 [추가] 학부모 목록 불러오기 함수
  const fetchParents = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, phone")
        .eq("role", "parent")
        .eq("branch_id", branchId);
      
      if (!error && data) setParents(data);
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
        .eq("branch_id", branchId) // 🚀 지점 갈라치기: 현재 접속한 지점의 카테고리만
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
        const { data: children } = await supabase
          .from("children")
          .select("*")
          .eq("parent_id", user.id);
        const isAdultAssigned =
          profile?.target_class && String(profile.target_class).trim() !== "";
        const isChildAssigned = children?.some(
          (child: any) =>
            child.target_class && String(child.target_class).trim() !== "",
        );
        setIsClassAssigned(!!(isAdultAssigned || isChildAssigned));
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
        .eq("id", branchId) // 🚀 지점 정보도 Context의 branchId로 가져오기
        .single();

      if (branchData) {
        console.log("[Purchase] 🔍 DB에서 가져온 MID:", branchData.kspay_mid); // 이 로그가 찍히는지 확인
        setCurrentBranch(branchData);
        setBranchMid(branchData.kspay_mid || "2999199999"); // 테스트 아이디라도 강제 주입
      }

      const { data, error } = await supabase
        .from("packages")
        .select(`*, package_options (*)`)
        .eq("branch_id", branchId) // 🚀 지점 갈라치기: 현재 접속한 지점의 패키지만
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
    } finally { // 🚀 정상적인 문법으로 수정 완료!
      setLoading(false);
    }
  };

  // --- 결제 프로세스 ---
  // 🚀 [수정] 관리자는 직접 결제(processCompletePayment)를 하지 않고 청구서(payment_requests)만 발행합니다.
  // 기존 결제 승인 로직은 ParentPaymentScreen으로 이동해야 하므로 여기서는 청구서 발송 함수로 대체합니다.
  
  const handleSendInvoice = async () => {
    if (!selectedParent) return Alert.alert("알림", "청구서를 받을 학부모님을 선택해주세요.");
    if (cartItems.length === 0) return Alert.alert("알림", "상품을 담아주세요.");
    if (!currentUser) return Alert.alert("알림", "관리자 정보를 불러올 수 없습니다.");

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
              
              // 1. payment_requests 테이블에 저장
              const { error: dbError } = await supabase
                .from("payment_requests")
                .insert([{
                  order_no: orderNo,
                  parent_id: selectedParent.id,
                  parent_name: selectedParent.name, // 🚀 추가된 학부모 이름 기록
                  sender_id: currentUser.id,        // 🚀 발송자(코치) ID 기록
                  branch_id: branchId,
                  total_amount: finalPrice,
                  cart_items: cartItems,
                  status: "pending"
                }]);
              
              if (dbError) throw dbError;

              // 2. 학부모에게 푸시 알림 발송 (안전하게 catch 처리)
              try {
                await sendGlobalPushNotification({
                  targetBranchId: null,
                  targetUserId: selectedParent.id,
                  title: `💳 이용권 결제 요청`,
                  body: `코치님이 보낸 이용권 청구서(${formatCurrency(finalPrice)})가 도착했습니다.`,
                  type: "payment"
                });
              } catch (pushError) {
                console.log("[Billing] ⚠️ 푸시 알림 발송 중 에러 (DB는 저장됨):", pushError);
              }

              Alert.alert("성공", "청구서가 성공적으로 발송되었습니다!");
              setCartItems([]); // 장바구니 초기화
              setSelectedParent(null); // 선택된 학부모 초기화
              setIsCartExpanded(false);
              setShowOptionModal(false);
            } catch (error) {
              console.error("[Billing] ❌ 청구서 발송 에러:", error);
              Alert.alert("오류", "청구서 발송에 실패했습니다.");
            } finally {
              setIsProcessing(false);
            }
          } 
        }
      ]
    );
  };

  // --- 장바구니 및 기타 핸들러 ---
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
  const hasConsult = cartItems.some((c) => c.pkg.is_consult);
  const popupOptions = allPackages.filter(
    (p) => p.is_option && !cartItems.some((cart) => cart.pkg.id === p.id),
  );

  // 🚀 [수정] 결제 준비 로직 대체 -> 옵션 팝업 후 [최종 결제] 버튼 누를 때 청구서 발송 트리거
  const handleOpenPayment = () => {
    if (cartItems.length === 0) return Alert.alert("알림", "상품을 담아주세요.");
    if (!selectedParent) return Alert.alert("알림", "청구서를 받을 학부모님을 선택해주세요.");
    
    // 모달 닫고 바로 발송 로직 태우기
    setShowOptionModal(false);
    handleSendInvoice(); 
  };

  // 🚀 [수정] 관리자 여부도 Context에서 받아온 role로 검증 가능 (본부장님이 스왑 가능하도록)
  const isDeveloper = role === "admin" || currentUser?.role === "admin";

  // 🚀 [추가] 실시간 검색 필터링 로직
  const filteredParents = parents.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    const phoneClean = p.phone ? p.phone.replace(/-/g, '') : "";
    const searchPhoneClean = searchQuery.replace(/-/g, '');
    
    return p.name.toLowerCase().includes(searchLower) || phoneClean.includes(searchPhoneClean);
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
            // 🚀 [수정] 관리자가 지점을 누르면 전역 지점이 바뀝니다. (setBranch 함수 호출)
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
        {/* 🚀 [추가] 학부모 선택 영역 */}
        <TouchableOpacity 
          style={styles.parentSelectBox} 
          onPress={() => {
            setSearchQuery(""); // 모달 열 때 검색어 초기화
            setShowParentModal(true);
          }}
        >
          <View>
            <Text style={styles.parentSelectLabel}>결제 요청 대상 (학부모)</Text>
            <Text style={selectedParent ? styles.parentSelectedText : styles.parentPlaceholderText}>
              {selectedParent ? `${selectedParent.name} 학부모님` : '여기를 눌러 대상을 선택해주세요'}
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

      {/* 배민 스타일 통합 하단 푸터 */}
      <View style={styles.integratedFooterWrapper}>
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
              // 🚀 [수정] 어드민은 복잡한 체크 없이 바로 청구서 발송 로직(또는 옵션 추가 팝업)을 띄웁니다.
              if (popupOptions.length > 0) setShowOptionModal(true);
              else handleSendInvoice();
            }}
          >
            <Text style={styles.mainActionText}>청구서 발송</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🚀 [수정] 학부모 검색 및 선택 모달 */}
      <Modal visible={showParentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>학부모 선택</Text>
              <TouchableOpacity onPress={() => setShowParentModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            {/* 🚀 [추가] 검색창 UI */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
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

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
              {/* 🚀 [수정] parents.map 대신 filteredParents.map 사용 */}
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
                  <Text style={styles.parentListPhone}>{p.phone || "연락처 미등록"}</Text>
                </TouchableOpacity>
              ))}
              {filteredParents.length === 0 && (
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="search-outline" size={40} color="#E2E8F0" />
                  <Text style={styles.emptySearchText}>검색된 학부모님이 없습니다.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🚀 [유지] 상담 유도 모달 */}
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
                onPress={async () => {
                  if (currentUser)
                    await supabase.from("consultation_requests").insert({
                      user_id: currentUser.id,
                      branch_id: branchId,
                      request_type: "KAKAO",
                      status: "PENDING",
                    });
                  Linking.openURL(
                    branchContact.kakao || "https://pf.kakao.com/_xxxxxx",
                  );
                }}
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
                onPress={async () => {
                  if (currentUser)
                    await supabase.from("consultation_requests").insert({
                      user_id: currentUser.id,
                      branch_id: branchId,
                      request_type: "PHONE",
                      status: "PENDING",
                    });
                  Linking.openURL(
                    `tel:${branchContact.phone || "010-0000-0000"}`,
                  );
                }}
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

      {/* 추가 옵션 팝업 모달 */}
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
                onPress={handleOpenPayment} // 🚀 [수정] 모달에서 결제 누르면 청구서 발송 트리거
              >
                <Text style={styles.finalPayBtnText}>최종 청구서 발송</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 로딩 오버레이 */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.processingText}>
            요청을 처리 중입니다...
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
  
  // 🚀 [추가] 학부모 선택 영역 스타일
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
    borderColor: "#C7D2FE" 
  },
  parentSelectLabel: { fontSize: 12, color: "#6366F1", fontWeight: "700", marginBottom: 4 },
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
  tabText: { fontSize: 15, fontWeight: "600", color: "#94A3B8" },
  activeTabText: { color: "#111827", fontWeight: "800" },
  scrollContent: {},
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
  
  // 🚀 [추가] 검색창 관련 스타일
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B", padding: 0 },
  emptySearchContainer: { paddingVertical: 40, alignItems: "center" },
  emptySearchText: { color: "#94A3B8", fontSize: 14, fontWeight: "600", marginTop: 12 },

  // 🚀 [추가] 학부모 리스트 모달 스타일
  parentListItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
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