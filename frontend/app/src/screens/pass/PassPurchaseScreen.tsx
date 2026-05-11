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
  is_option?: boolean; // 🚀 추가: DB의 is_option 컬럼 (팝업 옵션 여부)
  display_order?: number; // 🚀 정렬용: DB의 display_order
  price?: number;
  total_count?: number; // 💡 total_sessions 대신 이것을 사용하거나 둘 다 정의
  duration_in_days?: number;
  weekly_limit?: number;
  package_options: PackageOption[];
}

// 🚀 장바구니에 담길 아이템 인터페이스 (수량 quantity 추가!)
interface CartItem {
  uniqueId: string;
  pkg: Package;
  optIndex: number;
  quantity: number; // 🚀 같은 제품을 여러 개 살 수 있도록 수량 추가
}

const formatCurrency = (amount: number | null) => {
  // 🚀 상담 요망 -> 0원으로 변경
  if (amount === null || amount === 0) return "0원";
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
};

export default function PassPurchaseScreen({ navigation }: any) {
  const [selectedBranchId, setSelectedBranchId] = useState<
    "branch_1" | "branch_2"
  >("branch_1");
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("regular");
  const [packages, setPackages] = useState<Package[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]); // 전체 데이터 보관용
  const [loading, setLoading] = useState(true);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [selectedCountIndex, setSelectedCountIndex] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 🚀 다자녀 처리를 위한 상태 추가
  const [allChildren, setAllChildren] = useState<any[]>([]); 
  const [selectedChild, setSelectedChild] = useState<any>(null);
  
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showKSPay, setShowKSPay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 🚀 스택형 장바구니 상태 관리
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartExpanded, setIsCartExpanded] = useState(false); // 장바구니 펼침 상태
  
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
        
      if (children) {
        setAllChildren(children);
        // 🚀 팀장님 결단: 구매 시점에서는 누굴 지정할 필요 없이 무조건 공용이므로 초기화!
        setSelectedChild(null);
      }

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
      
      // 🚀 순서 문제 해결 1: nullsFirst=false 옵션으로 빈 값을 뒤로 보냄
      const { data, error } = await supabase
        .from("packages")
        .select(`*, package_options (*)`)
        .eq("branch_id", selectedBranchId)
        .order("display_order", { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      
      // 🚀 순서 문제 해결 2: 자바스크립트 단에서 한 번 더 강력하게 정렬 (쐐기 박기)
      const sortedData = (data || []).sort((a, b) => {
        const orderA = a.display_order ?? 999; // 값이 없으면 맨 뒤(999)로
        const orderB = b.display_order ?? 999;
        return orderA - orderB;
      });

      setAllPackages(sortedData);

      // 🚀 is_option 상관없이 해당 카테고리 패키지면 모두 표시 (단품 구매 가능)
      const displayPackages = sortedData.filter(
        (p) => p.category_id === activeCategory
      );
      
      setPackages(displayPackages);
      
      if (displayPackages && displayPackages.length > 0) {
        setSelectedMainId(displayPackages[0].id);
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
        // 🚀 다건(장바구니) 결제 DB 기록: 수량(quantity)만큼 DB에 개별 행으로 인서트
        const dbInserts: any[] = [];
        
        cartItems.forEach((cartItem) => {
          const opt = cartItem.pkg.package_options?.[cartItem.optIndex];
          const optionTotalCount = opt?.total_count || cartItem.pkg.total_count || 10;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + (cartItem.pkg.duration_in_days || 30));

          // 수량만큼 반복해서 DB 삽입 배열에 넣습니다.
          for (let i = 0; i < cartItem.quantity; i++) {
            dbInserts.push({
              user_id: currentUser.id,
              package_id: cartItem.pkg.id,
              package_name: `${cartItem.pkg.name} (${opt?.label || "기본"})`, // 예: 정규반 (10회)
              total_count: optionTotalCount,
              remaining_count: optionTotalCount,
              expiry_date: expiryDate.toISOString(),
              branch_id: selectedBranchId,
              child_id: null, // 🚀 팀장님 최종 기획 반영: 구매 시에는 무조건 null로 세팅!
              child_name: "공용 이용권", // 🚀 누구나 쓸 수 있다는 의미로 네이밍
              price: opt?.price || cartItem.pkg.price || 0,
              status: "active",
            });
          }
        });

        const { error: dbError } = await supabase.from("user_packages").insert(dbInserts);

        if (dbError) throw dbError;
        navigation.replace("PurchaseSuccess");
      } else {
        throw new Error("결제 승인 응답 실패");
      }
    } catch (e: any) {
      console.error(e);
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

  // 🚀 장바구니에 아이템 담기 (중복 시 수량만 증가)
  const addToCart = (pkg: Package, optIndex: number) => {
    const existingIndex = cartItems.findIndex(
      (c) => c.pkg.id === pkg.id && c.optIndex === optIndex
    );

    if (existingIndex !== -1) {
      // 이미 같은 상품+옵션이 있으면 수량만 +1
      const newCart = [...cartItems];
      newCart[existingIndex].quantity += 1;
      setCartItems(newCart);
    } else {
      // 없으면 새로 추가
      setCartItems([
        ...cartItems,
        { uniqueId: Date.now().toString() + Math.random(), pkg, optIndex, quantity: 1 }
      ]);
    }
    setIsCartExpanded(true); // 담으면 장바구니 열기
  };

  // 🚀 장바구니 내 수량 조절
  const updateQuantity = (uniqueId: string, delta: number) => {
    setCartItems((prev) => {
      const updated = prev.map((item) => {
        if (item.uniqueId === uniqueId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      });
      return updated;
    });
  };

  // 🚀 장바구니 내 아이템 완전 삭제
  const removeCartItem = (uniqueId: string) => {
    const newCart = cartItems.filter((c) => c.uniqueId !== uniqueId);
    setCartItems(newCart);
    if (newCart.length === 0) setIsCartExpanded(false);
  };

  // 🚀 장바구니(cartItems) 수량 곱한 총 금액 계산
  const finalPrice = cartItems.reduce((sum, cartItem) => {
    const p = cartItem.pkg.package_options?.[cartItem.optIndex]?.price || cartItem.pkg.price || 0;
    return sum + (p * cartItem.quantity); // 수량 반영
  }, 0);

  // 🚀 장바구니에 들어있는 총 상품 개수
  const totalCartCount = cartItems.reduce((acc, c) => acc + c.quantity, 0);

  // 🚀 장바구니에 상담 전용 상품이 하나라도 들어있는지 확인
  const hasConsult = cartItems.some(c => c.pkg.is_consult);

  // 🚀 팝업 옵션 필터링: DB에서 is_option=true 이면서 장바구니(cartItems)에 안 담긴 놈만 팝업 표시
  const popupOptions = allPackages.filter(
    (p) => p.is_option && !cartItems.some(cart => cart.pkg.id === p.id)
  );

  const handleOpenPayment = () => {
    if (cartItems.length === 0) {
      Alert.alert("알림", "원하시는 상품을 화면에서 담아주세요.");
      return;
    }
    if (!currentUser) {
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
        // 🚀 하단 가림 완벽 방지: 장바구니가 열려있을 땐 여백을 400으로 팍 늘려주고, 닫히면 160으로 줍니다.
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: isCartExpanded && cartItems.length > 0 ? 400 : 160 }
        ]}
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
              // 🚀 장바구니에 들어있는지 확인하여 테두리 색상 처리용
              const isInCart = cartItems.some(c => c.pkg.id === item.id);
              
              return (
                <View
                  key={item.id}
                  style={[
                    styles.packageCard,
                    // 🚀 카드 선택시 혹은 장바구니에 이미 담겨있을 때 파란색 테두리 유지
                    (isSelected || isInCart) && styles.selectedCard,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => {
                      // 🚀 강제 장바구니행 방지: 누르면 옵션창(아래 View)만 열립니다!
                      setSelectedMainId(item.id);
                      setSelectedCountIndex(0);
                    }}
                  >
                    {/* 🚀 불필요한 라디오(동그라미) UI 완벽 제거 */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.packageSubDesc}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  {/* 🚀 옵션이 열렸을 때 (선택된 카드일 때) */}
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
                          
                          {/* 🚀 담기 버튼 및 가격 명확히 분리 */}
                          <View style={styles.priceRow}>
                            <Text style={styles.priceValue}>
                              {formatCurrency(
                                item.package_options[selectedCountIndex]?.price ||
                                  item.price ||
                                  0,
                              )}
                            </Text>
                            <TouchableOpacity 
                              style={styles.addCartBtn} 
                              onPress={() => addToCart(item, selectedCountIndex)}
                            >
                              <Text style={styles.addCartBtnText}>장바구니 담기</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        // 상담 전용 상품일 경우
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

      {/* 🚀 스택 장바구니 + 결제 푸터 일체형 패널 */}
      <View style={styles.integratedFooterWrapper}>
        
        {/* 장바구니 헤더 (토글 버튼 역할) */}
        <TouchableOpacity 
          style={styles.cartToggleHeader}
          onPress={() => cartItems.length > 0 && setIsCartExpanded(!isCartExpanded)}
          activeOpacity={0.8}
        >
          <Text style={styles.cartToggleText}>
            {cartItems.length > 0 ? `🛒 장바구니에 ${totalCartCount}개 담김` : '🛒 상품을 선택해주세요'}
          </Text>
          {cartItems.length > 0 && (
            <Ionicons name={isCartExpanded ? "chevron-down" : "chevron-up"} size={20} color="#64748B" />
          )}
        </TouchableOpacity>

        {/* 🚀 펼쳐지는 장바구니 리스트 영역 */}
        {isCartExpanded && cartItems.length > 0 && (
          <View style={styles.cartListContainer}>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {cartItems.map((cartItem) => {
                const opt = cartItem.pkg.package_options?.[cartItem.optIndex];
                const price = opt?.price || cartItem.pkg.price || 0;
                return (
                  <View key={cartItem.uniqueId} style={styles.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>
                        {cartItem.pkg.name} {opt ? `(${opt.label})` : ""}
                      </Text>
                      <Text style={styles.cartItemPrice}>{formatCurrency(price * cartItem.quantity)}</Text>
                    </View>
                    
                    {/* 🚀 수량 컨트롤러 (+, -) */}
                    <View style={styles.quantityController}>
                      <TouchableOpacity onPress={() => updateQuantity(cartItem.uniqueId, -1)} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={16} color="#64748B" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(cartItem.uniqueId, 1)} style={styles.qtyBtn}>
                        <Ionicons name="add" size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* 삭제 버튼 */}
                    <TouchableOpacity onPress={() => removeCartItem(cartItem.uniqueId)} style={styles.deleteBtn}>
                      <Ionicons name="close" size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 결제하기 버튼 영역 */}
        <View style={styles.payBar}>
          <View style={styles.payInfoBox}>
            <Text style={styles.payInfoLabel}>총 결제 금액</Text>
            <Text style={styles.payInfoPrice}>{hasConsult ? "상담 대기" : formatCurrency(finalPrice)}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.mainActionBtn,
              hasConsult && styles.consultActionBtn,
              cartItems.length === 0 && { backgroundColor: '#94A3B8' } // 비었을 때 회색 처리
            ]}
            onPress={() => {
              if (cartItems.length === 0) {
                Alert.alert("알림", "원하시는 상품에서 [담기] 버튼을 눌러주세요.");
                return;
              }
              if (hasConsult) {
                Linking.openURL(`tel:${branchContact.phone || "010-0000-0000"}`);
              } else if (!isClassAssigned) {
                setShowConsultModal(true);
              } else if (popupOptions.length > 0) {
                setShowOptionModal(true);
              } else {
                setShowKSPay(true);
              }
            }}
          >
            <Text style={styles.mainActionText}>
              {hasConsult ? "상담 전화하기" : "결제하기"}
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
              <Text style={styles.modalTitle}>추가 혜택 추천</Text>
              <TouchableOpacity onPress={() => setShowOptionModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.optionList}>
              {/* 🚀 팝업 옵션 리스트 렌더링 */}
              {popupOptions.map((opt) => {
                // 팝업에서 담은 것도 즉시 장바구니로 들어갑니다!
                const isChecked = cartItems.some(c => c.pkg.id === opt.id);
                const optPrice = opt.package_options?.[0]?.price || opt.price || 0;
                
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.optionItem}
                    onPress={() => {
                      if (isChecked) {
                        setCartItems(cartItems.filter(c => c.pkg.id !== opt.id));
                      } else {
                        addToCart(opt, 0); // 팝업에서는 기본 옵션(0)으로 1개 담기
                      }
                    }}
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
            // 🚀 다건 결제명: 총 상품 개수에 따라 OOO 외 N건 표시
            packageName: totalCartCount > 1 
              ? `${cartItems[0].pkg.name} 외 ${totalCartCount - 1}건`
              : `${cartItems[0].pkg.name} (${cartItems[0].pkg.package_options?.[cartItems[0].optIndex]?.label || "기본"})`,
            userName: currentUser.name,
            userPhone: currentUser.phone || "01000000000",
            packageId: cartItems[0].pkg.id, // 대표 ID 하나만 전송
            userId: currentUser.id,
            childId: null, // 🚀 결제 단계에서는 자녀 정보를 넘기지 않음
            childName: "공용 이용권",
            // 💡 DB 컬럼명에 맞춰 totalCount라는 Key로 전송합니다.
            totalCount: cartItems[0].pkg.package_options?.[cartItems[0].optIndex]?.total_count || 10,
            durationInDays: cartItems[0].pkg.duration_in_days || 30,
            weeklyLimit: cartItems[0].pkg.weekly_limit || 2,
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
  
  // 🚀 통합 일체형 푸터가 화면 하단을 덮으므로 paddingBottom은 동적으로 위에서 관리함!
  scrollContent: { }, 
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
  // 🚀 라디오(동그라미) 관련 스타일 완전 삭제
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
  
  // 🚀 새로 추가한 [담기] 버튼 영역 스타일
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  addCartBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addCartBtnText: {
    color: "#4F46E5",
    fontWeight: "800",
    fontSize: 14,
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
  
  // 🚀 [디자인 개선] 배민 스타일 일체형 하단 푸터
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // 아이폰 하단 홈바 대응
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
  cartToggleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  cartListContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  cartItemName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cartItemPrice: { fontSize: 14, color: "#6366F1", marginTop: 4, fontWeight: "700" },
  
  // 🚀 수량 컨트롤러 스타일 (+, -)
  quantityController: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginRight: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 12,
  },
  deleteBtn: {
    padding: 4,
  },

  payBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  payInfoBox: {
    flex: 1,
  },
  payInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  payInfoPrice: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
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