import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";
import KSPayService from "../../services/payment/KSPayService";
import EventBanner from "../../components/EventBanner"; // 🚀 공통 배너 컴포넌트 사용[cite: 4]

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

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === 0) return "0원";
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
};

export default function PassPurchaseScreen({ navigation }: any) {
  // 🚀 [수정] 기존에 수동으로 관리하던 selectedBranchId를 삭제하고 Context에서 가져옵니다.
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
  const [showKSPay, setShowKSPay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClassAssigned, setIsClassAssigned] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [branchContact, setBranchContact] = useState({ phone: "", kakao: "" });
  const [branchMid, setBranchMid] = useState<string>("");

  // 🚀 [핵심 추가] 상담 대기 중인 상태를 관리하는 변수
  const [hasPendingConsult, setHasPendingConsult] = useState(false);
  const [pendingConsultType, setPendingConsultType] = useState<string | null>(
    null,
  ); // 👈 타입 저장용

  // --- 초기 데이터 로딩 ---
  useEffect(() => {
    // 🚀 branchId가 없으면 로딩 대기
    if (!branchId) return;

    fetchInitialData();
    fetchCategoriesFromDB(true);
  }, [branchId]); // 🚀 의존성 배열에 branchId 적용

  useEffect(() => {
    if (activeCategory && branchId) {
      // 🚀 branchId 추가
      fetchPackagesFromDB();
    }
  }, [activeCategory, branchId]); // 🚀 의존성 배열에 branchId 적용

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

        // 🚀 [추가] 상담 신청 내역 확인 (PENDING 상태인 게 하나라도 있으면 true)
        const { data: consultData } = await supabase
          .from("consultation_requests")
          .select("id, request_type") // 👈 request_type 추가
          .eq("user_id", user.id)
          .eq("branch_id", branchId)
          .eq("status", "PENDING")
          .maybeSingle();

        setHasPendingConsult(!!consultData);
        setPendingConsultType(consultData?.request_type || null); // 👈 타입 저장
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
        const mid = branchData.kspay_mid?.trim();
        setBranchMid(mid || "2999199999"); // 실결제 MID가 없으면 테스트 아이디 사용
        setBranchContact({
          phone: branchData.phone_number || "",
          kakao: branchData.kakao_link || "",
        });
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
    } finally {
      setLoading(false);
    }
  };

  // 🚀 [핵심 추가] 카카오/전화 버튼 클릭 로직 통합 (중복 신청 방지)
  const handleConsultRequest = async (type: "KAKAO" | "PHONE") => {
    try {
      const { data: existing } = await supabase
        .from("consultation_requests")
        .select("id, request_type")
        .eq("user_id", currentUser.id)
        .eq("branch_id", branchId)
        .eq("status", "PENDING")
        .maybeSingle();

      if (!existing) {
        // 첫 신청 시
        await supabase.from("consultation_requests").insert({
          user_id: currentUser.id,
          branch_id: branchId,
          request_type: type, // 최초 선택한 채널 타입 저장
          status: "PENDING",
        });
        setHasPendingConsult(true);
        Alert.alert("상담 신청 완료", "관리자가 확인 후 연락드리겠습니다.");
        // 첫 신청 후 연결
        if (type === "KAKAO")
          Linking.openURL(
            branchContact.kakao || "https://pf.kakao.com/_xxxxxx",
          );
        else Linking.openURL(`tel:${branchContact.phone || "010-0000-0000"}`);
      } else {
        // 이미 신청한 경우: 이전 신청 타입과 다른 수단을 제안
        const prevType =
          existing.request_type === "KAKAO" ? "카카오톡" : "전화";
        const otherType = type === "KAKAO" ? "전화" : "카카오톡";

        Alert.alert(
          "상담 접수 중",
          `이미 ${prevType}(으)로 상담 신청이 접수되었습니다.\n\n다른 방법으로 급히 연락하시겠어요?`,
          [
            { text: "닫기", style: "cancel" },
            {
              text: `${otherType} 연결`,
              onPress: () => {
                if (type === "KAKAO")
                  Linking.openURL(
                    branchContact.kakao || "https://pf.kakao.com/_xxxxxx",
                  );
                else
                  Linking.openURL(
                    `tel:${branchContact.phone || "010-0000-0000"}`,
                  );
              },
            },
          ],
        );
      }
      setShowConsultModal(false);
    } catch (error) {
      console.error("상담 신청 에러:", error);
      Alert.alert("오류", "연결 중 문제가 발생했습니다.");
    }
  };

  // --- 결제 프로세스 ---
  const processCompletePayment = async (payKey: string) => {
    setIsProcessing(true);
    console.log("[Payment] 🚀 결제 승인 프로세스 시작");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userToken = session?.access_token;

      const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
      const cleanKey = rawKey.replace(/['"]+/g, "").trim();
      const authUrl = process.env.EXPO_PUBLIC_SERVER_AUTH_URL || "";

      console.log("[Payment] 📤 서버로 보내는 데이터:", {
        payKey: payKey,
        amount: finalPrice,
        branch_id: branchId, // 🚀 결제 승인 시 지점 ID 전송
      });

      console.log("[Payment] 🌐 서버 승인 API 호출 중...");

      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken || cleanKey}`,
          apikey: cleanKey,
        },
        body: JSON.stringify({
          payKey: payKey,
          amount: finalPrice,
          branch_id: branchId, // 🚀 결제 승인 바디에도 지점 ID
        }),
      });

      const resText = await response.text();
      console.log("[Payment] 📥 서버 원본 응답:", resText);

      const authResult = JSON.parse(resText);

      if (response.ok) {
        console.log("[Payment] ✅ 승인 성공 - DB 기록 중...");

        // 1. [추가] 통합 결제 장부에 먼저 기록
        const { data: paymentRecord, error: payError } = await supabase
          .from("payments")
          .insert({
            user_id: currentUser.id,
            branch_id: branchId,
            total_amount: finalPrice,
            payment_method: "CARD", // PG 결제이므로 CARD로 고정
            status: "paid",
            pg_tid: authResult.trno || "N/A", // 서버 응답에서 거래번호 매칭
          })
          .select("id")
          .single();

        if (payError) throw payError;

        const dbInserts = cartItems.flatMap((item) =>
          Array(item.quantity).fill({
            user_id: currentUser.id,
            package_id: item.pkg.id,
            payment_id: paymentRecord.id,
            package_name: item.pkg.name,
            total_count:
              item.pkg.package_options?.[item.optIndex]?.total_count || 10,
            remaining_count:
              item.pkg.package_options?.[item.optIndex]?.total_count || 10,
            branch_id: branchId, // 🚀 DB 인서트 시에도 유저의 지점 ID로 기록
            child_id: null,
            child_name: "공용 이용권",
            price:
              item.pkg.package_options?.[item.optIndex]?.price ||
              item.pkg.price ||
              0,
            status: "active",
            is_shuttle: item.pkg.is_shuttle || false,
            expiry_date: dayjs().endOf("month").format("YYYY-MM-DD"),
          }),
        );

        const { error: dbError } = await supabase
          .from("user_packages")
          .insert(dbInserts);
        if (dbError) throw dbError;

        console.log("[Payment] 🎉 모든 처리 완료!");
        navigation.replace("PurchaseSuccess");
      } else {
        console.error(
          "[Payment] ❌ 서버 승인 실패:",
          authResult.message || resText,
        );
        throw new Error(authResult.message || "결제 승인 실패");
      }
    } catch (e: any) {
      console.error("[Payment] ❌ 최종 에러:", e.message);
      navigation.replace("PurchaseFail");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseKSPay = (success: boolean, payKey?: string) => {
    setShowKSPay(false);
    console.log(`[Purchase] 🏁 결제창 종료됨 - 성공여부: ${success}`);
    if (success && payKey) {
      console.log("[Purchase] ✨ 인증 성공, 0.6초 후 최종 승인 호출");
      setTimeout(() => processCompletePayment(payKey), 600);
    }
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

  const handleOpenPayment = () => {
    console.log("[Purchase] 💳 결제 준비");
    if (cartItems.length === 0)
      return Alert.alert("알림", "상품을 담아주세요.");
    if (!currentUser)
      return Alert.alert("알림", "유저 정보를 불러올 수 없습니다.");

    console.log(
      `[Purchase] 📊 결제 데이터 요약: ${totalCartCount}개 상품 / 총액 ${finalPrice}원 / MID ${branchMid}`,
    );
    setShowOptionModal(false);
    setShowKSPay(true);
  };

  const isDeveloper = role === "admin" || currentUser?.role === "admin";

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
              {branchId === "branch_1" ? "시흥본점" : "영종도점"} 이용권
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
              {currentBranch?.name || "지점"} 이용권
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
          {/* 🚀 공통 동적 배너 컴포넌트로 깔끔하게 일원화 (중복 마크업 완벽 차단) */}
          <EventBanner
            screenType="purchase"
            branchId={branchId}
            marginHorizontal={0} // mainPadding(20) 내부 레이아웃에 최적화되도록 설정[cite: 1]
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
              • 다자녀의 경우 자녀 수만큼 이용권을 각각 구매해 주세요.
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
      <View
        style={[
          styles.integratedFooterWrapper,
          { paddingBottom: (insets.bottom || 16) + 8 },
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
            <Text style={styles.payInfoLabel}>총 결제 금액</Text>
            <Text style={styles.payInfoPrice}>
              {hasConsult ? "상담 대기" : formatCurrency(finalPrice)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.mainActionBtn,
              hasConsult && styles.consultActionBtn,
              cartItems.length === 0 && { backgroundColor: "#94A3B8" },
            ]}
            onPress={() => {
              if (cartItems.length === 0)
                return Alert.alert(
                  "알림",
                  "원하시는 상품에서 [담기] 버튼을 눌러주세요.",
                );

              if (hasConsult) {
                Linking.openURL(
                  `tel:${branchContact.phone || "010-0000-0000"}`,
                );
              } else if (!isClassAssigned) {
                if (hasPendingConsult) {
                  const prevType =
                    pendingConsultType === "KAKAO" ? "카카오톡" : "전화";
                  Alert.alert(
                    "상담 접수 중",
                    `이미 ${prevType}(으)로 상담 신청이 접수되었습니다.\n관리자의 연락을 기다려주세요!`,
                    [
                      { text: "닫기", style: "cancel" },
                      {
                        text: "전화 연결",
                        onPress: () =>
                          Linking.openURL(
                            `tel:${branchContact.phone || "010-0000-0000"}`,
                          ),
                      },
                      {
                        text: "카카오톡 문의",
                        onPress: () =>
                          Linking.openURL(
                            branchContact.kakao ||
                              "https://pf.kakao.com/_xxxxxx",
                          ),
                      },
                    ],
                  );
                } else {
                  setShowConsultModal(true);
                }
              } else if (popupOptions.length > 0) {
                setShowOptionModal(true);
              } else {
                setShowKSPay(true);
              }
            }}
          >
            <Text style={styles.mainActionText}>
              {hasConsult
                ? "상담 전화하기"
                : !isClassAssigned && hasPendingConsult
                  ? "상담 대기 중"
                  : "결제하기"}
            </Text>
          </TouchableOpacity>
        </View>
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
                onPress={() => handleConsultRequest("KAKAO")}
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
                onPress={() => handleConsultRequest("PHONE")}
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
                <Text style={styles.finalPayBtnText}>최종 결제 진행</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showKSPay && currentUser && cartItems.length > 0 && (
        <KSPayService
          isVisible={showKSPay}
          onClose={handleCloseKSPay}
          paymentData={{
            amount: finalPrice,
            packageName:
              totalCartCount > 1
                ? `${cartItems[0].pkg.name} 외 ${totalCartCount - 1}건`
                : `${cartItems[0].pkg.name}`,
            userName: currentUser.name,
            userPhone: currentUser.phone || "01000000000",
            kspay_mid: branchMid,
            userId: currentUser.id,
            branchId: branchId,
            branchName: currentBranch?.name || "지점",
            storeId: branchMid,
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
    paddingRight: 50,
    alignItems: "center",
  },
  tab: {
    marginRight: 20,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },

  // 💡 [중복 제거 완료] bannerDotRow, adBanner, adTitle 등 하드코딩 배너 스타일 파편 전체 청소[cite: 1]

  activeTab: { borderBottomColor: "#6366F1" },
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
