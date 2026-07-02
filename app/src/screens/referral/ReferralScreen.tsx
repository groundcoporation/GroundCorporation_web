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
  // 🚀 [추가] 레벨 및 정책 데이터 상태 (등급 표시용)
  // =========================================================================
  const [userData, setUserData] = useState<any>(null); // 유저 전체 정보
  const [levelInfo, setLevelInfo] = useState<any>(null); // 현재 유저의 등급 정책 정보
  const [nextLevelInfo, setNextLevelInfo] = useState<any>(null); // 다음 등급 정책 정보

  // =========================================================================
  // 🚀 [추가/수정] DB 정책 수치 상태 (이용 안내 및 공유 문구 동적 반영용)
  // =========================================================================
  const [minWithdraw, setMinWithdraw] = useState(10000);
  const [minUse, setMinUse] = useState(3000);
  const [signupBonus, setSignupBonus] = useState(2000); // 🚀 [추가] 가입 보너스 동적 관리
  const [shareMessageTemplate, setShareMessageTemplate] = useState<string>(""); // 🚀 [추가] 공유 메시지 템플릿 DB화

  // =========================================================================
  // 🚀 [기존] 인출 모달창 관리를 위한 상태 변수들
  // =========================================================================
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // =========================================================================
  // 🚀 [신규] 포인트 전환을 위한 상태 변수들 (인증 & 전환 팝업)
  // =========================================================================
  const [showAuthModal, setShowAuthModal] = useState(false); // 쇼핑몰 계정 인증 팝업
  const [mallId, setMallId] = useState("");
  const [mallPw, setMallPw] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [showConvertModal, setShowConvertModal] = useState(false); // 포인트 전환 팝업
  const [convertAmount, setConvertAmount] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  // 딥링크 등을 통해 파라미터로 전달받은 추천인 코드 확인
  const initialReferralCode = route?.params?.referralCode;

  // 🚀 [실시간 구독] 내 데이터 변경 감지 (게이지 및 모든 데이터 자동 반영)
  useEffect(() => {
    if (!user) return;
    
    // 유저 데이터, 등급 정책, 설정 변경 모두 감지하는 통합 채널
    const channel = supabase
      .channel('realtime_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, () => fetchUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'level_policies' }, () => fetchUserData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_settings' }, () => fetchUserData())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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
    // 🚀 [수정] 유저 데이터, 등급 정보, 포인트 설정값을 한 번에 로드 (shopping_mall_id도 가져옴!)
    const [
      { data: userData },
      { data: settings }
    ] = await Promise.all([
      supabase.from("users").select("id, name, username, points, referred_by, level, referral_count, lineage, shopping_mall_id").eq("id", user?.id).single(),
      supabase.from("point_settings").select("key, value, value_text")
    ]);

    if (userData) {
      setUserData(userData);
      setMyReferralCode(userData.username); // 아이디를 추천 코드로 사용
      setPoints(userData.points || 0);
      setAlreadyReferred(!!userData.referred_by);

      // 🚀 [핵심] 현재 등급 정책 정보 가져오기
      const { data: currentPolicy } = await supabase
        .from("level_policies")
        .select("*")
        .eq("level", userData.level)
        .single();
      setLevelInfo(currentPolicy);

      // 🚀 [핵심] 다음 등급 정책 정보 가져오기 (승급 조건 확인용)
      const { data: nextPolicy } = await supabase
        .from("level_policies")
        .select("*")
        .eq("level", userData.level + 1)
        .maybeSingle(); // 최고등급일 경우 null일 수 있으므로 maybeSingle 사용
      setNextLevelInfo(nextPolicy);
    }
    
    // 🚀 정책 값 동적 매핑
    if (settings) {
      const w = settings.find(s => s.key === 'min_withdraw_amount')?.value;
      const u = settings.find(s => s.key === 'min_use_amount')?.value;
      const b = settings.find(s => s.key === 'signup_bonus')?.value; // 🚀 [추가] 가입 보너스 가져오기
      const msg = settings.find(s => s.key === 'referral_share_message')?.value_text; // 🚀 [추가] 공유 메시지 템플릿 가져오기
      
      if (w) setMinWithdraw(Number(w));
      if (u) setMinUse(Number(u));
      if (b) setSignupBonus(Number(b)); // 🚀 [추가] 상태 업데이트
      if (msg) setShareMessageTemplate(msg);
    }
  };

  // 추천 링크 공유하기
  const onShare = async () => {
    // 🚀 [수정] 우리가 방금 배포한 만능 엣지 펑션 주소로 교체
    const shareLink = `https://wsdyrercgbvwlssntwvy.supabase.co/functions/v1/invite?ref=${myReferralCode}`;

    // 🚀 DB에서 가져온 템플릿이 있으면 동적 치환하고, 없으면 기본 하드코딩 템플릿 사용
    let shareMessage = "";
    if (shareMessageTemplate) {
      shareMessage = shareMessageTemplate
        .replace(/{signup_bonus}/g, signupBonus.toLocaleString())
        .replace(/{share_link}/g, shareLink)
        .replace(/{referral_code}/g, myReferralCode);
    } else {
      shareMessage = `[🎁 특별 초대장] 
안전한 학원 픽업 서비스 '아이패스케어'에 초대합니다!

지금 아래 링크를 통해 앱을 설치하고 바로 가입하시면, 즉시 사용 가능한 ${signupBonus.toLocaleString()}P가 자동으로 적립됩니다. 🎉
(※ 앱 실행 시 초대 팝업을 꼭 확인해 주세요!)

👇 ${signupBonus.toLocaleString()}P 혜택 받고 가입하기 (자동 추천인 등록)
${shareLink}

💡 혹시 가입창에 추천인이 안 보인다면?
• 추천인 ID: ${myReferralCode}
(직접 입력하셔도 동일하게 ${signupBonus.toLocaleString()}P가 지급됩니다!)`;
    }

    try {
      await Share.share({
        message: shareMessage,
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
          .select("id, name, points, username, lineage, referral_count")
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

      const currentSignupBonus = Number(bonusData?.value) || 1000;
      const newLineage = [...(referrer.lineage || []), referrer.id]; // 🚀 족보 형성

      // 2. 포인트 지급 및 족보/카운트 업데이트
      await supabase.from("users").update({ 
        referred_by: targetCode, 
        points: points + currentSignupBonus,
        lineage: newLineage 
      }).eq("id", user?.id);

      // 3. 추천인 포인트 지급 & 추천수 증가 & 적립 로그 기록을 안전한 RPC로 한 방에 처리!
      const { error: rpcError } = await supabase.rpc('process_referral_points', {
        referrer_id: referrer.id,
        new_user_id: user?.id,
        bonus_amount: currentSignupBonus,
        new_user_name: userData?.name || myReferralCode
      });
      if (rpcError) console.error('추천인 포인트 RPC 처리 에러:', rpcError);

      // 4. 가입자 본인의 적립 로그 기록 (본인 계정은 RLS 정책 통과 가능)
      await supabase.from("point_logs").insert({ 
        user_id: user?.id, 
        amount: currentSignupBonus, 
        type: "earn", 
        reason: `추천인 등록 가입 포인트 적립 (추천인: ${referrer.name || referrer.username})`, 
        related_user_id: referrer.id 
      });

      Alert.alert("성공", "추천인 등록 완료!");
      setAlreadyReferred(true);
      fetchUserData(); 
    } catch (e) {
      Alert.alert("오류", "추천인 등록 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 🚀 [기존] 포인트 현금 인출 신청 핵심 로직
  // =========================================================================
  const handleWithdrawRequest = async () => {
    const amountNum = Number(withdrawAmount);

    if (!bankName || !accountNumber || !accountHolder || !withdrawAmount) {
      Alert.alert("알림", "계좌 정보를 모두 입력해주세요.");
      return;
    }
    if (amountNum < minWithdraw) {
      Alert.alert("알림", `${minWithdraw.toLocaleString()}P 이상부터 인출 가능합니다.`);
      return;
    }
    if (amountNum > points) {
      Alert.alert("알림", "보유 포인트가 부족합니다.");
      return;
    }

    setIsWithdrawing(true);
    try {
      await supabase.from("users").update({ points: points - amountNum }).eq("id", user?.id);
      await supabase.from("withdrawal_requests").insert({ user_id: user?.id, bank_name: bankName, account_number: accountNumber, account_holder: accountHolder, amount: amountNum });
      await supabase.from("point_logs").insert({ user_id: user?.id, amount: -amountNum, type: "withdraw", reason: "포인트 현금 인출 신청" });

      Alert.alert("신청 완료", "정상 접수되었습니다.");
      setShowWithdrawModal(false);
      setBankName(""); setAccountNumber(""); setAccountHolder(""); setWithdrawAmount("");
      fetchUserData();
    } catch (e: any) {
      Alert.alert("오류", "인출 중 문제가 발생했습니다.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // =========================================================================
  // 🚀 [진짜 로직] 쇼핑몰 계정 인증 (PHP API 실제 연동 완료!)
  // =========================================================================
  const handleMallAuth = async () => {
    if (!mallId || !mallPw) {
      Alert.alert("알림", "쇼핑몰 아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setIsAuthenticating(true);
    try {
      // 1. 쇼핑몰 PHP API로 아이디와 비밀번호 쏘기 (도메인 주소를 팀장님 쇼핑몰로 바꾸세요!)
      const response = await fetch("http://vog-sports.com/api_verify_user.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: `mb_id=${encodeURIComponent(mallId)}&mb_password=${encodeURIComponent(mallPw)}`,
      });

      // 2. 쇼핑몰의 대답(JSON) 확인하기
      const result = await response.json();

      if (result.success) {
        // 3. 대답이 '성공'이면 그때서야 Supabase DB에 아이디를 쾅! 박아줍니다.
        // result.mb_id 를 통해 쇼핑몰에서 확인된 정확한 ID를 저장합니다.
        await supabase.from("users").update({ shopping_mall_id: result.mb_id }).eq("id", user?.id);
        
        Alert.alert("인증 완료", "쇼핑몰 계정 연동이 완료되었습니다!");
        setShowAuthModal(false);
        fetchUserData(); // 데이터 갱신 (버튼 상태 변경용)
      } else {
        // 4. 대답이 '실패'면 경고창 띄우기 (비밀번호 틀림 등)
        Alert.alert("인증 실패", result.message || "아이디 또는 비밀번호가 틀렸습니다.");
      }
    } catch (error: any) {
      // 🚀 에러의 상세 정보를 터미널에 뱉어내기!
      console.error("--- 상세 에러 시작 ---");
      console.error("에러 메시지:", error.message);
      console.error("에러 객체 상세:", JSON.stringify(error, null, 2));
      console.error("--- 상세 에러 끝 ---");
      
      Alert.alert("통신 오류", "서버와 연결할 수 없습니다. 터미널 로그를 확인해주세요.");
    } finally {
      // ⭐️ 이 코드는 절대 지우지 마세요! 버튼 로딩을 멈추는 핵심입니다.
      setIsAuthenticating(false);
    }
  };

  // =========================================================================
  // 🚀 [진짜 로직 완료] 포인트 전환 로직 (쇼핑몰 실제 포인트 충전 연동!)
  // =========================================================================
  const handlePointConvert = async () => {
    const amountNum = Number(convertAmount);

    if (!convertAmount) {
      Alert.alert("알림", "전환할 금액을 입력해주세요.");
      return;
    }
    if (amountNum < 5000) { 
      Alert.alert("알림", "5,000P 이상부터 전환 가능합니다.");
      return;
    }
    if (amountNum > points) {
      Alert.alert("알림", "보유 포인트가 부족합니다.");
      return;
    }

    setIsConverting(true);
    try {
      // 1. 쇼핑몰 PHP API로 포인트 적립 요청 쏘기
      const response = await fetch("http://vog-sports.com/api_receive_point.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: `secret_key=${encodeURIComponent('ipasscare_secret_key_2026_vogsports')}&mb_id=${encodeURIComponent(userData?.shopping_mall_id)}&point_value=${amountNum}`,
      });

      const result = await response.json();

      if (result.success) {
        // 2. 쇼핑몰에서 적립 성공 대답이 왔을 때만 앱(Supabase) 보유 포인트를 차감합니다!
        const nextPoints = points - amountNum;
        await supabase.from("users").update({ points: nextPoints }).eq("id", user?.id);
        
        // 3. 앱 포인트 영수증(로그) 기록
        await supabase.from("point_logs").insert({ 
          user_id: user?.id, 
          amount: -amountNum, 
          type: "withdraw", 
          reason: `쇼핑몰(${userData?.shopping_mall_id}) 포인트 전환` 
        });

        Alert.alert("전환 완료", `${amountNum.toLocaleString()}P가 쇼핑몰 포인트로 정상 전환되었습니다!`);
        setShowConvertModal(false);
        setConvertAmount("");
        fetchUserData(); // 상단 포인트 카드 금액 실시간 갱신
      } else {
        // 쇼핑몰 오류 발생 시 차감 안 함
        Alert.alert("전환 실패", result.message || "쇼핑몰 포인트 적립 중 문제가 발생했습니다.");
      }
    } catch (error) {
      Alert.alert("통신 오류", "쇼핑몰 서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      console.log("포인트 전환 API 에러:", error);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>친구 추천</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 🚀 [최적화된 포인트 카드] 등급 정보를 상단 카드로 배치 */}
        <View style={styles.mainCard}>
          {levelInfo && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelInfo.level_name}</Text>
            </View>
          )}
          <Text style={styles.label}>나의 보유 포인트</Text>
          <Text style={styles.pointsText}>{points.toLocaleString()} P</Text>
          {levelInfo && (
            <Text style={styles.rateText}>본인 결제 시 {levelInfo.self_rate}% 적립 중</Text>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.subBtn} onPress={() => navigation.navigate("PointHistory")}>
              <Text style={styles.subBtnText}>내역 보기</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.subBtn} 
              onPress={() => points < minWithdraw ? Alert.alert("알림", `${minWithdraw.toLocaleString()}P 이상부터 가능합니다.`) : setShowWithdrawModal(true)}
            >
              <Text style={styles.subBtnText}>인출하기</Text>
            </TouchableOpacity>

            {/* 🚀 [팀장님 기획 반영] 포인트 전환 버튼 */}
            <TouchableOpacity 
              style={[styles.subBtn, { backgroundColor: '#1E40AF' }]} // 강조 컬러
              onPress={() => {
                if (!userData?.shopping_mall_id) {
                  setShowAuthModal(true); // 쇼핑몰 ID가 없으면 '인증 팝업'
                } else {
                  setShowConvertModal(true); // 있으면 '전환 팝업'
                }
              }}
            >
              <Text style={styles.subBtnText}>포인트 전환</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🚀 [게이지바] 승급 정보 안내 카드 */}
        {levelInfo && (
          <View style={styles.upgradeCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="rocket" size={20} color="#3B82F6" />
              <Text style={styles.upgradeText}>
                {nextLevelInfo 
                  ? `${nextLevelInfo.level_name} 승급까지 ${(nextLevelInfo.min_referrals - (userData?.referral_count || 0))}명 남았습니다.`
                  : "최고 등급을 달성하셨습니다! 🎉"}
              </Text>
            </View>
            {nextLevelInfo && (
              <View style={styles.gaugeContainer}>
                <View style={[styles.gaugeFill, { width: `${Math.min((userData?.referral_count / nextLevelInfo.min_referrals) * 100, 100)}%` }]} />
              </View>
            )}
          </View>
        )}

        <EventBanner screenType="referral" branchId={user?.branch_id} marginHorizontal={0} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 추천 코드 공유</Text>
          <View style={styles.codeRow}>
            <Text style={styles.myCode}>{myReferralCode}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={onShare}>
              <Ionicons name="share-social-outline" size={20} color="white" />
              <Text style={styles.buttonText}>링크 공유</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!alreadyReferred && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>추천인 등록 (1회)</Text>
            <TextInput style={styles.input} placeholder="추천인 아이디 입력" value={referrerInput} onChangeText={setReferrerInput} autoCapitalize="none" />
            <TouchableOpacity style={styles.actionButton} onPress={() => handleRegisterReferrer()} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>등록하고 포인트 받기</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.noticeSection}>
          <Text style={styles.noticeHeader}>💡 이용 안내 및 유의사항</Text>
          <Text style={styles.noticeText}>• 쇼핑몰 포인트 전환은 아이패스케어 제휴 쇼핑몰 계정 인증 후 가능합니다.</Text>
          <Text style={styles.noticeText}>• 포인트 인출은 {minWithdraw.toLocaleString()}P 이상부터 신청 가능합니다.</Text>
          <Text style={styles.noticeText}>• 포인트 사용은 {minUse.toLocaleString()}P부터 자유롭게 사용하실 수 있습니다.</Text>
          <Text style={styles.noticeText}>• 결제 시 사용하시는 등급에 따라 포인트가 차등 적립됩니다.</Text>
        </View>
      </ScrollView>

      {/* ========================================================= */}
      {/* 🚀 모달 1: 현금 인출 팝업 (기존 유지) */}
      {/* ========================================================= */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>포인트 현금 인출 신청</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}><Ionicons name="close" size={24} color="#111827" /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput style={styles.modalInput} placeholder="은행명" value={bankName} onChangeText={setBankName} />
              <TextInput style={styles.modalInput} placeholder="계좌번호 (- 제외)" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
              <TextInput style={styles.modalInput} placeholder="예금주" value={accountHolder} onChangeText={setAccountHolder} />
              <TextInput style={styles.modalInput} placeholder="인출 금액 (P)" value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="number-pad" />
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleWithdrawRequest}>
                {isWithdrawing ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitBtnText}>신청하기</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 🚀 모달 2: 쇼핑몰 계정 인증 팝업 (최초 1회) */}
      {/* ========================================================= */}
      <Modal visible={showAuthModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>쇼핑몰 계정 인증</Text>
              <TouchableOpacity onPress={() => setShowAuthModal(false)}><Ionicons name="close" size={24} color="#111827" /></TouchableOpacity>
            </View>
            <Text style={styles.modalSubText}>포인트 전환을 위해 제휴 쇼핑몰 계정을 최초 1회 인증해 주세요.</Text>
            <View style={styles.modalBody}>
              <TextInput style={styles.modalInput} placeholder="쇼핑몰 아이디" value={mallId} onChangeText={setMallId} autoCapitalize="none" />
              <TextInput style={styles.modalInput} placeholder="쇼핑몰 비밀번호" value={mallPw} onChangeText={setMallPw} secureTextEntry />
              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#1E40AF' }]} onPress={handleMallAuth}>
                {isAuthenticating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitBtnText}>인증하기</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 🚀 모달 3: 포인트 전환 팝업 (인증 완료된 유저용) */}
      {/* ========================================================= */}
      <Modal visible={showConvertModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>포인트 전환</Text>
              <TouchableOpacity onPress={() => setShowConvertModal(false)}><Ionicons name="close" size={24} color="#111827" /></TouchableOpacity>
            </View>
            <View style={{ backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginBottom: 15 }}>
              <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>연결된 쇼핑몰 계정: {userData?.shopping_mall_id}</Text>
            </View>
            <View style={styles.modalBody}>
              <TextInput 
                style={styles.modalInput} 
                placeholder="전환할 포인트 입력 (최소 5,000P)" 
                value={convertAmount} 
                onChangeText={setConvertAmount} 
                keyboardType="number-pad" 
              />
              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#1E40AF' }]} onPress={handlePointConvert}>
                {isConverting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitBtnText}>쇼핑몰로 전환하기</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 16, alignItems: "center", backgroundColor: "#fff" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#111" },
  content: { padding: 20 },
  mainCard: { backgroundColor: "#3B82F6", padding: 24, borderRadius: 24, marginBottom: 15, alignItems: 'center', shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  label: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginBottom: 8 },
  pointsText: { color: "#fff", fontSize: 40, fontWeight: "900", marginBottom: 5 },
  rateText: { color: "#EFF6FF", fontSize: 13, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12 },
  levelText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  subBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginHorizontal: 4 }, // 간격 살짝 조정
  subBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  upgradeCard: { backgroundColor: '#F0F7FF', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#DBEAFE' },
  upgradeText: { marginLeft: 10, fontSize: 14, color: '#1E40AF', fontWeight: '600' },
  gaugeContainer: { height: 8, backgroundColor: '#DBEAFE', borderRadius: 4, marginTop: 5, overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
  section: { backgroundColor: "#fff", padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: "#f1f5f9" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 15, color: "#333" },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  myCode: { fontSize: 20, fontWeight: "bold", color: "#6366F1", backgroundColor: "#EEF2FF", paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, flex: 1, marginRight: 10, textAlign: "center" },
  shareButton: { backgroundColor: "#6366F1", flexDirection: "row", paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  actionButton: { backgroundColor: "#111827", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { color: "white", fontWeight: "bold" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 10 },
  noticeSection: { marginTop: 10, paddingBottom: 40 },
  noticeHeader: { fontSize: 14, fontWeight: "800", color: "#475569", marginBottom: 12 },
  noticeItem: { marginBottom: 8 },
  noticeText: { fontSize: 12, color: "#64748B", lineHeight: 18, marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  modalBody: { marginTop: 10 },
  modalSubText: { fontSize: 14, color: "#64748B", marginBottom: 15, lineHeight: 20 },
  modalInput: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 15, fontSize: 15, marginBottom: 12 },
  modalSubmitBtn: { backgroundColor: "#6366F1", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 10 },
  modalSubmitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});