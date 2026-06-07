import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";
import KSPayService from "../../services/payment/KSPayService"; // 🚀 KSPay 모듈 임포트

const formatCurrency = (amount: number) => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
};

export default function CheckoutScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();

  // 🚀 PassPurchaseScreen에서 넘겨준 파라미터들 받기
  const {
    type = "CART",
    cartItems = [],
    totalAmount = 0,
    currentUser,
    branchId,
    branchMid,
    currentBranch,
    invoiceId, // 🚀 인보이스용 ID
  } = route.params || {};

  const [myPoints, setMyPoints] = useState(0);
  const [usePoints, setUsePoints] = useState<string>("");

  // 🚀 [수정] 초기값 0으로 설정, DB 값을 로드하여 업데이트합니다.
  const [minUsePoint, setMinUsePoint] = useState(0);

  // 🚀 결제 관련 상태 추가
  const [showKSPay, setShowKSPay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      if (!currentUser?.id) return;

      // 1. 내 포인트 가져오기
      const { data: profile } = await supabase
        .from("users")
        .select("points")
        .eq("id", currentUser.id)
        .single();

      if (profile) setMyPoints(profile.points || 0);

      // 2. 🚀 DB의 point_settings에서 최소 사용 금액 가져오기
      const { data: settings, error } = await supabase
        .from("point_settings")
        .select("value")
        .eq("key", "min_use_amount")
        .single();

      if (settings?.value) {
        setMinUsePoint(parseInt(settings.value, 10));
      } else {
        setMinUsePoint(0); // 설정 없을 시 기본값
      }
    } catch (e) {
      console.error("데이터 로드 실패:", e);
      setMinUsePoint(0);
    }
  };

  const handlePointChange = (text: string) => {
    const numValue = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numValue)) {
      setUsePoints("");
      return;
    }
    const maxUsable = Math.min(myPoints, totalAmount);
    if (numValue > maxUsable) {
      setUsePoints(maxUsable.toString());
    } else {
      setUsePoints(numValue.toString());
    }
  };

  const handleUseAllPoints = () => {
    const maxUsable = Math.min(myPoints, totalAmount);
    if (maxUsable === 0) return;
    setUsePoints(maxUsable.toString());
  };

  const usedPointsNum = parseInt(usePoints || "0", 10);
  const finalAmount = totalAmount - usedPointsNum;

  // 🚀 결제 준비 (PG 모듈 띄우기)
  const handleProceedPayment = () => {
    // 🚀 [검증] 최소 사용 금액 체크
    if (usedPointsNum > 0 && usedPointsNum < minUsePoint) {
      Alert.alert(
        "알림",
        `포인트는 ${formatCurrency(minUsePoint)}부터 사용 가능합니다.`,
      );
      return;
    }

    // 💡 [수정] 최종 결제 금액이 0원이면 바로 전액 결제 프로세스로 이동
    if (finalAmount <= 0) {
      Alert.alert("포인트 결제", "포인트로 전액 결제하시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "확인", onPress: () => processCompletePayment("POINT_FULL") },
      ]);
      return;
    }

    setShowKSPay(true);
  };

  // 🚀 PG 모듈 닫힘 및 성공 시 서버 승인 호출
  const handleCloseKSPay = (success: boolean, payKey?: string) => {
    setShowKSPay(false);
    if (success && payKey) {
      setTimeout(() => processCompletePayment(payKey), 600);
    }
  };

  // 🚀 결제 승인 + DB 기록 로직
  const processCompletePayment = async (payKey: string) => {
    setIsProcessing(true);
    try {
      let tid = "POINT_FULL";

      // 💡 결제 금액이 0원보다 클 때만 PG 서버 통신
      if (payKey !== "POINT_FULL") {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userToken = session?.access_token;
        const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
        const cleanKey = rawKey.replace(/['"]+/g, "").trim();
        const authUrl = process.env.EXPO_PUBLIC_SERVER_AUTH_URL || "";

        // 1. Edge Function 호출 (PG 승인) - finalAmount 전달
        const response = await fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken || cleanKey}`,
            apikey: cleanKey,
          },
          body: JSON.stringify({
            payKey: payKey,
            amount: finalAmount,
            branch_id: branchId,
            used_points: usedPointsNum,
          }),
        });

        const resText = await response.text();
        console.log("[Checkout] PG 응답 원본:", resText);

        // 💡 [수정] 거래번호(pg_tid)를 안전하게 추출
        try {
          const authResult = JSON.parse(resText);
          let extractedTrNo = null;

          if (authResult.rawText) {
            const segments = authResult.rawText.split("`");
            const cleanSegments = segments.filter(
              (s: string) => s.trim() !== "",
            );
            console.log("[Checkout] 🧩 파싱된 세그먼트:", cleanSegments);

            if (cleanSegments.length >= 5) {
              // 🚀 [수정] 응답 전문의 두 번째 요소(index 1)가 실제 거래번호(TRNO)입니다.
              extractedTrNo = cleanSegments[1];
            }
          }
          tid =
            extractedTrNo ||
            authResult.trno ||
            authResult.tid ||
            authResult.trNo ||
            "N/A";
        } catch (e) {
          if (resText.includes("|")) tid = resText.split("|")[1] || "N/A";
        }
        if (!response.ok) throw new Error("결제 승인 실패");
      }

      // 2. 💡 DB `payments` 테이블에 데이터 기록
      const { data: paymentRecord, error: payError } = await supabase
        .from("payments")
        .insert({
          user_id: currentUser.id,
          branch_id: branchId,
          total_amount: totalAmount, // 원래 총액
          used_points: usedPointsNum, // 사용한 포인트
          final_amount: finalAmount, // 실제 카드 결제액
          payment_method: finalAmount > 0 ? "CARD" : "POINT", // 0원이면 POINT로 기록
          status: "paid",
          pg_tid: tid, // 🚀 위에서 추출한 실제 거래번호 기록
        })
        .select("id")
        .single();

      if (payError) throw payError;

      // 3. 💡 포인트 사용 시 유저 포인트 차감
      if (usedPointsNum > 0) {
        await supabase
          .from("users")
          .update({ points: myPoints - usedPointsNum })
          .eq("id", currentUser.id);
      }

      // 4. 🚀 [수정] 구매한 패키지를 user_packages에 인서트 (분기 처리)
      if (type === "CART") {
        const dbInserts = cartItems.flatMap((item: any) =>
          Array(item.quantity).fill({
            user_id: currentUser.id,
            payment_id: paymentRecord.id,
            package_id: item.pkg.id,
            package_name: item.pkg.name,
            total_count:
              item.pkg.package_options?.[item.optIndex]?.total_count || 10,
            remaining_count:
              item.pkg.package_options?.[item.optIndex]?.total_count || 10,
            branch_id: branchId,
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
      } else if (type === "INVOICE") {
        // 🚀 인보이스 결제 시 요청서 상태 변경
        const { error: updateError } = await supabase
          .from("payment_requests")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        if (updateError) throw updateError;

        // 인보이스에 포함된 상품들도 user_packages에 지급
        const dbInserts = cartItems.flatMap((item: any) =>
          Array(item.quantity).fill({
            user_id: currentUser.id,
            payment_id: paymentRecord.id,
            package_id: item.pkg.id,
            package_name: item.pkg.name,
            total_count:
              item.pkg.package_options?.[item.optIndex]?.total_count || 10,
            remaining_count:
              item.pkg.package_options?.[item.optIndex]?.total_count || 10,
            branch_id: branchId,
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
        await supabase.from("user_packages").insert(dbInserts);
      }

      navigation.replace("PurchaseSuccess");
    } catch (e: any) {
      console.error("[Checkout] 에러:", e.message);
      navigation.replace("PurchaseFail");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주문/결제</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 주문 상품 내역 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주문 상품</Text>
            <View style={styles.card}>
              {cartItems.map((item: any, idx: number) => {
                const opt = item.pkg.package_options?.[item.optIndex];
                const price = opt?.price || item.pkg.price || 0;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.itemRow,
                      idx !== cartItems.length - 1 && styles.borderBottom,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.pkg.name}</Text>
                      {opt && (
                        <Text style={styles.itemOpt}>옵션: {opt.label}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.itemPrice}>
                        {formatCurrency(price * item.quantity)}
                      </Text>
                      <Text style={styles.itemQty}>수량 {item.quantity}개</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* 포인트 사용 영역 */}
          <View style={styles.section}>
            <View style={styles.pointHeader}>
              <Text style={styles.sectionTitle}>포인트 사용</Text>
              <Text style={styles.myPointText}>
                보유 {formatCurrency(myPoints)}
              </Text>
            </View>
            <View style={styles.card}>
              <View style={styles.pointInputWrapper}>
                <TextInput
                  style={styles.pointInput}
                  value={usePoints}
                  onChangeText={handlePointChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.pointUnit}>P</Text>
                <TouchableOpacity
                  style={styles.useAllBtn}
                  onPress={handleUseAllPoints}
                >
                  <Text style={styles.useAllBtnText}>전액 사용</Text>
                </TouchableOpacity>
              </View>
              {myPoints > 0 && minUsePoint > 0 && (
                <Text style={styles.pointNotice}>
                  * 포인트는 {formatCurrency(minUsePoint)}부터 사용 가능합니다.
                </Text>
              )}
            </View>
          </View>

          {/* 결제 상세 영수증 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>결제 상세</Text>
            <View style={styles.receiptCard}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>상품 총액</Text>
                <Text style={styles.receiptValue}>
                  {formatCurrency(totalAmount)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>포인트 사용</Text>
                <Text style={[styles.receiptValue, { color: "#EF4444" }]}>
                  {usedPointsNum > 0
                    ? `-${formatCurrency(usedPointsNum)}`
                    : "0원"}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.receiptRowTotal}>
                <Text style={styles.receiptLabelTotal}>최종 결제 금액</Text>
                <Text style={styles.receiptValueTotal}>
                  {formatCurrency(finalAmount)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 하단 결제 버튼 */}
      <View
        style={[styles.bottomFooter, { paddingBottom: insets.bottom || 20 }]}
      >
        <TouchableOpacity style={styles.payBtn} onPress={handleProceedPayment}>
          <Text style={styles.payBtnText}>
            {formatCurrency(finalAmount)} 결제하기
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🚀 KSPay 모듈 연동 */}
      {showKSPay && currentUser && (
        <KSPayService
          isVisible={showKSPay}
          onClose={handleCloseKSPay}
          paymentData={{
            amount: finalAmount,
            packageName:
              cartItems.length > 1
                ? `${cartItems[0]?.pkg?.name} 외 ${cartItems.length - 1}건`
                : `${cartItems[0]?.pkg?.name || "결제"}`,
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

      {/* 🚀 처리 중 로딩 */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.processingText}>결제를 처리 중입니다...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 20, paddingBottom: 120 },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  itemOpt: { fontSize: 13, color: "#64748B" },
  itemPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  itemQty: { fontSize: 13, color: "#64748B" },
  pointHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  myPointText: { fontSize: 14, fontWeight: "700", color: "#6366F1" },
  pointInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pointInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    padding: 0,
  },
  pointUnit: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 8,
  },
  useAllBtn: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  useAllBtnText: { color: "#6366F1", fontSize: 13, fontWeight: "700" },
  pointNotice: { fontSize: 12, color: "#94A3B8", marginTop: 10 },
  receiptCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  receiptLabel: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  receiptValue: { fontSize: 15, color: "#1E293B", fontWeight: "700" },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
    borderStyle: "dashed",
  },
  receiptRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptLabelTotal: { fontSize: 16, color: "#111827", fontWeight: "800" },
  receiptValueTotal: { fontSize: 24, color: "#6366F1", fontWeight: "900" },
  bottomFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  payBtn: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  payBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
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
});
