import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// 🚀 KSNET 결제 모듈 임포트
import KSPayService from "../../services/payment/KSPayService";
import { useAuth } from "../../context/AuthContext";

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === 0) return "0원";
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
};

// 🚀 [수정] 컴포넌트 이름을 InvoiceScreen으로 변경
export default function InvoiceScreen({ navigation }: any) {
  const { branchId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentBranch, setCurrentBranch] = useState<any>(null);

  // DB에서 불러온 청구서 목록
  const [invoices, setInvoices] = useState<any[]>([]);

  // 결제 관련 상태
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showKSPay, setShowKSPay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. 현재 접속한 유저 정보 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      // 2. 지점 정보 가져오기 (KSPay MID 등)
      if (profile?.branch_id) {
        const { data: branchData } = await supabase
          .from("branches")
          .select("*")
          .eq("id", profile.branch_id)
          .single();
        setCurrentBranch(branchData);
      }

      // 3. 내 앞으로 온 '결제 대기(pending)' 청구서 불러오기
      const { data: requests, error: reqError } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("parent_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;
      setInvoices(requests || []);
    } catch (e: any) {
      console.error("[Invoice] 데이터 로드 실패:", e.message);
      Alert.alert("오류", "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 결제창 열기
  const handleOpenPayment = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowKSPay(true);
  };

  // KSNET 결제창 닫힘 콜백 -> 성공 시 백엔드 승인 로직 호출
  const handleCloseKSPay = (success: boolean, payKey?: string) => {
    setShowKSPay(false);
    if (success && payKey && selectedInvoice) {
      console.log("[Invoice] ✨ KSNET 인증 성공, 최종 승인 호출");
      setTimeout(() => processCompletePayment(payKey, selectedInvoice), 600);
    } else {
      setSelectedInvoice(null);
    }
  };

  // 최종 결제 승인 및 이용권 지급 로직
  const processCompletePayment = async (payKey: string, invoice: any) => {
    setIsProcessing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userToken = session?.access_token;

      const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
      const cleanKey = rawKey.replace(/['"]+/g, "").trim();
      const authUrl = process.env.EXPO_PUBLIC_SERVER_AUTH_URL || "";

      // 1. KSPAY 서버 최종 승인 API 호출 (Edge Function 호출)
      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken || cleanKey}`,
          apikey: cleanKey,
        },
        body: JSON.stringify({
          payKey: payKey,
          amount: invoice.total_amount,
          branch_id: currentBranch?.id || invoice.branch_id,
        }),
      });

      const resText = await response.text();
      console.log("[Invoice] 📥 엣지 펑션 응답 원본:", resText);

      let authResult;
      try {
        authResult = JSON.parse(resText);
      } catch (parseError) {
        console.error("JSON 파싱 에러! 서버 응답이 JSON이 아닙니다:", resText);
        throw new Error(
          `서버 통신 오류가 발생했습니다.\n응답: ${resText.substring(0, 50)}...`,
        );
      }

      if (!response.ok) {
        throw new Error(
          authResult.error || authResult.message || "결제 승인 실패",
        );
      }

      console.log("[Invoice] ✅ 승인 성공 - DB 기록 중...");

      // 🚀 [핵심 보정] KSNET 백틱 구분자 문자열 파싱
      // KSNET 표준 데이터 포맷: `O`거래번호(12자리)`승인일시(14자리)`금액`승인번호...
      let extractedTrNo = null;
      let extractedAuthNo = null;

      if (authResult.rawText) {
        const segments = authResult.rawText.split("`");
        // 백틱으로 쪼갠 후 공백이나 빈 요소를 제거하여 배열 색인 불일치 방지
        const cleanSegments = segments.filter((s: string) => s.trim() !== "");

        if (cleanSegments.length >= 5) {
          extractedTrNo = cleanSegments[1]; // 거래번호 추출
          extractedAuthNo = cleanSegments[4]; // 승인번호(결제확인용 고유코드) 추출
        }
      }

      // 2. 청구서(payment_requests) 상태를 'paid'로 업데이트 및 결제 데이터 기록
      const { error: updateError } = await supabase
        .from("payment_requests")
        .update({
          status: "paid",
          // 🚀 파싱 결과를 우선 적용하고 없는 경우 기존 객체 매핑으로 폴백
          kspay_tr_no: extractedTrNo || authResult.trno || null,
          kspay_auth_no: extractedAuthNo || authResult.authno || null,
          paid_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (updateError) throw updateError;

      // 3. 지갑(user_packages)에 공용 이용권 인서트!
      const cartItems = invoice.cart_items || [];
      const dbInserts = cartItems.flatMap((item: any) =>
        Array(item.quantity).fill({
          user_id: currentUser.id,
          package_id: item.pkg.id,
          package_name: item.pkg.name,
          total_count:
            item.pkg.package_options?.[item.optIndex]?.total_count || 10,
          remaining_count:
            item.pkg.package_options?.[item.optIndex]?.total_count || 10,
          branch_id: invoice.branch_id,
          child_id: null,
          child_name: "공용 이용권",
          price:
            item.pkg.package_options?.[item.optIndex]?.price ||
            item.pkg.price ||
            0,
          status: "active",
          is_shuttle: item.pkg.is_shuttle || false,
        }),
      );

      const { error: dbError } = await supabase
        .from("user_packages")
        .insert(dbInserts);
      if (dbError) throw dbError;

      Alert.alert(
        "결제 완료",
        "이용권 결제가 완료되었습니다!\n마이페이지에서 확인해 주세요.",
        [
          {
            text: "확인",
            onPress: () => navigation.replace("PurchaseSuccess"),
          },
        ],
      );
    } catch (e: any) {
      console.error("[Invoice] ❌ 최종 에러:", e.message);
      Alert.alert("결제 실패", e.message);
    } finally {
      setIsProcessing(false);
      setSelectedInvoice(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>이용권 결제</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topSection}>
          <Text style={styles.welcomeText}>
            {currentUser ? `${currentUser.name} 회원님,` : "회원님,"}
          </Text>
          <Text style={styles.titleText}>도착한 결제 요청서가 있습니다.</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#6366F1"
            style={{ marginTop: 50 }}
          />
        ) : invoices.length > 0 ? (
          invoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <Ionicons
                  name="receipt"
                  size={20}
                  color="#6366F1"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.invoiceTitle}>청구 내역</Text>
              </View>

              <View style={styles.divider} />

              {/* 청구 상세 내역 렌더링 */}
              {invoice.cart_items?.map((item: any, idx: number) => {
                const opt = item.pkg.package_options?.[item.optIndex];
                return (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.pkg.name} {opt ? `(${opt.label})` : ""} x{" "}
                      {item.quantity}
                    </Text>
                  </View>
                );
              })}

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>총 결제 금액</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(invoice.total_amount)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => handleOpenPayment(invoice)}
              >
                <Text style={styles.payBtnText}>안전하게 결제하기</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-circle-outline"
              size={60}
              color="#CBD5E1"
            />
            <Text style={styles.emptyText}>
              현재 대기 중인 결제 요청이 없습니다.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 결제 모듈 */}
      {showKSPay && currentUser && selectedInvoice && (
        <KSPayService
          isVisible={showKSPay}
          onClose={handleCloseKSPay}
          paymentData={{
            amount: selectedInvoice.total_amount,
            packageName:
              selectedInvoice.cart_items.length > 1
                ? `${selectedInvoice.cart_items[0].pkg.name} 외 ${selectedInvoice.cart_items.length - 1}건`
                : selectedInvoice.cart_items[0].pkg.name,
            userName: currentUser.name,
            userPhone: currentUser.phone || "01000000000",
            kspay_mid: currentBranch?.kspay_mid || "2999199999",
            userId: currentUser.id,
            branchId: selectedInvoice.branch_id,
            branchName: currentBranch?.name || "지점",
            storeId: currentBranch?.kspay_mid || "2999199999",
          }}
        />
      )}

      {/* 로딩 오버레이 */}
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  topSection: { marginBottom: 24, marginTop: 10 },
  welcomeText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
  },
  titleText: { fontSize: 24, fontWeight: "800", color: "#1E293B" },

  invoiceCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  invoiceTitle: { fontSize: 18, fontWeight: "800", color: "#1E1B4B" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 16 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemName: { fontSize: 15, color: "#475569", fontWeight: "600" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#94A3B8" },
  totalAmount: { fontSize: 24, fontWeight: "900", color: "#6366F1" },

  payBtn: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  payBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "600",
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
});
