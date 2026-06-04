import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  ScrollView,
  Modal, // 🚀 [추가] 팝업창을 위한 Modal 컴포넌트 임포트
} from "react-native";
import EventBanner from "../../components/EventBanner"; // 🚀 동적 마스터 배너 컴포넌트 유지
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

// 내비게이션 route 파라미터 수신 인프라 복원
export default function ReferralScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [myReferralCode, setMyReferralCode] = useState("");
  const [referrerInput, setReferrerInput] = useState("");
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyReferred, setAlreadyReferred] = useState(false);

  // =========================================================================
  // 🚀 [추가] 인출 모달창 관리를 위한 상태 변수들
  // =========================================================================
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // 딥링크 등을 통해 파라미터로 전달받은 추천인 코드 확인
  const initialReferralCode = route?.params?.referralCode;

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  //  전달받은 딥링크 코드가 있고 아직 추천인 등록 전이라면 원터치 자동 실행 매커니즘
  useEffect(() => {
    if (
      user &&
      initialReferralCode &&
      !alreadyReferred &&
      myReferralCode &&
      !isLoading
    ) {
      if (initialReferralCode !== myReferralCode) {
        handleRegisterReferrer(initialReferralCode);
      }
    }
  }, [user, initialReferralCode, alreadyReferred, myReferralCode]);

  const fetchUserData = async () => {
    const { data } = await supabase
      .from("users")
      .select("username, points, referred_by")
      .eq("id", user?.id)
      .single();

    if (data) {
      setMyReferralCode(data.username); // 아이디를 추천 코드로 사용
      setPoints(data.points || 0);
      setAlreadyReferred(!!data.referred_by);
    }
  };

  // 추천 링크 공유하기
  const onShare = async () => {
    const playStoreLink = `https://play.google.com/store/apps/details?id=com.goundcorp.ipasscare&referrer=${myReferralCode}`;

    try {
      await Share.share({
        message: `[아이패스케어] 저와 함께 시작해요! \n\n추천인 코드: ${myReferralCode}\n지금 다운로드: ${playStoreLink}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  // 추천인 등록 로직 (이름/아이디 매칭 버전)
  const handleRegisterReferrer = async (code?: string) => {
    const targetCode = (code || referrerInput).trim();

    if (!targetCode) {
      Alert.alert("알림", "추천인의 아이디를 입력해주세요.");
      return;
    }
    if (targetCode === myReferralCode) {
      Alert.alert("오류", "자기 자신은 추천할 수 없습니다.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. 추천인 조회 및 보너스 값 가져오기
      const [{ data: referrer }, { data: bonusData }] = await Promise.all([
        supabase
          .from("users")
          .select("id, points, username")
          .ilike("username", targetCode)
          .maybeSingle(),
        supabase
          .from("point_settings")
          .select("value")
          .eq("key", "signup_bonus")
          .single(),
      ]);

      if (!referrer) {
        Alert.alert("오류", "존재하지 않는 사용자 아이디입니다.");
        return;
      }

      const signupBonus = Number(bonusData?.value) || 1000;
      const myUsername = myReferralCode;
      const referrerUsername = referrer.username;

      // 2. 포인트 지급
      await supabase
        .from("users")
        .update({ points: (referrer.points || 0) + signupBonus })
        .eq("id", referrer.id);
      await supabase
        .from("users")
        .update({ referred_by: targetCode, points: points + signupBonus })
        .eq("id", user?.id);

      // 3. 로그 기록 (이름/아이디 포함하여 직관적으로) - 🚀 type 컬럼 추가 반영
      await supabase.from("point_logs").insert([
        {
          user_id: referrer.id,
          amount: signupBonus,
          type: "earn",
          reason: `${myUsername} 님의 가입으로 받은 포인트`,
          related_user_id: user?.id,
        },
        {
          user_id: user?.id,
          amount: signupBonus,
          type: "earn",
          reason: `${referrerUsername} 님을 추천하여 받은 포인트`,
          related_user_id: referrer.id,
        },
      ]);

      Alert.alert(
        "성공",
        `추천인(${targetCode}) 등록 완료! ${signupBonus.toLocaleString()} 포인트가 지급되었습니다.`,
      );
      setAlreadyReferred(true);
      fetchUserData();
    } catch (e) {
      Alert.alert("오류", "추천인 등록 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 🚀 [추가] 포인트 현금 인출 신청 핵심 로직 (DB 연동 + 자동차감)
  // =========================================================================
  const handleWithdrawRequest = async () => {
    const amountNum = Number(withdrawAmount);

    if (!bankName || !accountNumber || !accountHolder || !withdrawAmount) {
      Alert.alert("알림", "계좌 정보를 모두 입력해주세요.");
      return;
    }
    if (amountNum < 10000) {
      Alert.alert("알림", "최소 10,000P 이상부터 인출 가능합니다.");
      return;
    }
    if (amountNum > points) {
      Alert.alert("알림", "보유 포인트가 부족합니다.");
      return;
    }

    setIsWithdrawing(true);
    try {
      // 1. 유저 보유 포인트 자동 차감 (업데이트)
      const { error: updateError } = await supabase
        .from("users")
        .update({ points: points - amountNum })
        .eq("id", user?.id);
      
      if (updateError) throw updateError;

      // 2. 관리자가 볼 인출 요청 DB 인서트
      const { error: requestError } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user?.id,
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
          amount: amountNum,
        });

      if (requestError) throw requestError;

      // 3. 내역(장부)에 마이너스(-) 로 인출 로그 기록 (type: withdraw 지정!)
      const { error: logError } = await supabase
        .from("point_logs")
        .insert({
          user_id: user?.id,
          amount: -amountNum,
          type: "withdraw",
          reason: "포인트 현금 인출 신청",
        });

      if (logError) throw logError;

      Alert.alert("신청 완료", "현금 인출 신청이 정상적으로 접수되었습니다.\n(관리자 확인 후 송금됩니다)");
      
      // 모달 닫기 및 초기화
      setShowWithdrawModal(false);
      setBankName("");
      setAccountNumber("");
      setAccountHolder("");
      setWithdrawAmount("");
      
      // 최신 잔여 포인트 갱신
      fetchUserData();
    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", "인출 신청 중 문제가 발생했습니다.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>친구 추천</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.label}>나의 보유 포인트</Text>
            
            {/* 🚀 [수정] 버튼들을 가로로 나란히 배치 */}
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.withdrawBtn, { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => navigation.navigate("PointHistory")} // 👈 나중에 만들 새 화면으로 이동
              >
                <Text style={styles.withdrawBtnText}>내역 보기</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.withdrawBtn}
                // 🚀 [수정] 인출하기 클릭 시 모달 띄우기 조건 적용
                onPress={() => {
                  if (points < 10000) {
                    Alert.alert("알림", "포인트 인출은 10,000P 이상부터 가능합니다.");
                  } else {
                    setShowWithdrawModal(true);
                  }
                }}
              >
                <Text style={styles.withdrawBtnText}>인출하기</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.pointsText}>{points.toLocaleString()} P</Text>
        </View>

        {/* 🚀 고정형 배너를 파쇄하고 데이터베이스 연동형 동적 이벤트 배너 연동 유지 */}
        <EventBanner
          screenType="referral"
          branchId={user?.branch_id}
          marginHorizontal={0} // 좌우 여백 패딩 조율 맞춤
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 추천 코드 공유</Text>
          <View style={styles.codeRow}>
            <Text style={styles.myCode}>{myReferralCode}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={onShare}>
              <Ionicons name="share-social-outline" size={20} color="white" />
              <Text style={styles.buttonText}>링크 공유</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>
            링크를 통해 가입하면 두 분 모두에게 포인트가 지급됩니다.
          </Text>
        </View>

        {!alreadyReferred && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>추천인 등록 (1회)</Text>
            <TextInput
              style={styles.input}
              placeholder="추천인 아이디 입력"
              value={referrerInput}
              onChangeText={setReferrerInput}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.actionButton, isLoading && { opacity: 0.7 }]}
              onPress={() => handleRegisterReferrer()}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>등록하고 포인트 받기</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {alreadyReferred && (
          <View style={styles.section}>
            <Text style={styles.referredNotice}>
              이미 추천인 등록을 완료하셨습니다.
            </Text>
            <Text style={styles.discountBadge}>
              1,000P 적립 혜택이 적용되었습니다!
            </Text>
          </View>
        )}

        <View style={styles.noticeSection}>
          <Text style={styles.noticeHeader}>💡 이용 안내 및 유의사항</Text>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>
              • 포인트 인출은 10,000P 이상부터 신청 가능합니다.
            </Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>
              • 포인트 사용은 상품 결제 시 3,000P부터 사용하실 수 있습니다.
            </Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>
              • 결제 적립: 추천인 0.1% / 피추천인 0.3% 적립 (개인 결제 시 0.3%
              기본 적립)
            </Text>
          </View>
          <View style={styles.noticeItem}>
            <Text style={styles.noticeText}>
              • 특별 혜택: 10명 이상 추천 시 0.5% 페이백, 30명 이상 추천 시 1%
              페이백 혜택이 적용됩니다.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* 🚀 [추가] 포인트 인출 팝업창 (Modal) */}
      {/* ========================================================================= */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>포인트 현금 인출 신청</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubText}>
                인출 가능 포인트: <Text style={{ color: '#4D96FF', fontWeight: 'bold' }}>{points.toLocaleString()} P</Text>
              </Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="은행명 (예: 국민은행)"
                value={bankName}
                onChangeText={setBankName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="계좌번호 (- 제외)"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="예금주 (실명)"
                value={accountHolder}
                onChangeText={setAccountHolder}
              />
              <TextInput
                style={[styles.modalInput, { borderColor: '#4D96FF', borderWidth: 2 }]}
                placeholder="인출할 금액 (P)"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="number-pad"
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isWithdrawing && { opacity: 0.7 }]}
                onPress={handleWithdrawRequest}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>신청하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  content: { padding: 20 },
  card: {
    backgroundColor: "#4D96FF",
    padding: 24,
    borderRadius: 20,
    marginBottom: 15,
    elevation: 5,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  withdrawBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  withdrawBtnText: { color: "white", fontSize: 12, fontWeight: "800" },
  label: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 5 },
  pointsText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  myCode: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4D96FF",
    backgroundColor: "#F0F5FF",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    textAlign: "center",
  },
  shareButton: {
    backgroundColor: "#4D96FF",
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: "#333",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold", marginLeft: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  infoText: { color: "#888", fontSize: 12, marginTop: 10 },
  referredNotice: { textAlign: "center", color: "#666", fontWeight: "bold" },
  discountBadge: {
    textAlign: "center",
    color: "#FF4B4B",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "bold",
  },
  noticeSection: {
    marginTop: 10,
    paddingHorizontal: 5,
    paddingBottom: 40,
  },
  noticeHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 12,
  },
  noticeItem: {
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    fontWeight: "500",
  },

  // 🚀 [추가] 모달창 스타일
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
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  modalBody: { marginTop: 10 },
  modalSubText: { fontSize: 14, color: "#64748B", marginBottom: 15 },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    marginBottom: 12,
  },
  modalSubmitBtn: {
    backgroundColor: "#4D96FF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  modalSubmitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});