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
  Dimensions,
} from "react-native";
import EventBanner from "../../components/EventBanner"; // 🚀 공통 배너 컴포넌트 사용
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

export default function ReferralScreen({ navigation }: any) {
  const { user } = useAuth();
  const [myReferralCode, setMyReferralCode] = useState("");
  const [referrerInput, setReferrerInput] = useState("");
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyReferred, setAlreadyReferred] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

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

  // 추천인 등록 로직
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
      const { data: referrer, error: refError } = await supabase
        .from("users")
        .select("id, points")
        .ilike("username", targetCode)
        .maybeSingle();

      if (refError) {
        console.error("추천인 조회 에러:", refError.message);
        Alert.alert("오류", "사용자 조회 중 문제가 발생했습니다.");
        return;
      }

      if (!referrer) {
        Alert.alert("오류", "존재하지 않는 사용자 아이디입니다.");
        return;
      }

      await supabase
        .from("users")
        .update({ points: (referrer.points || 0) + 1000 })
        .eq("id", referrer.id);

      await supabase
        .from("users")
        .update({
          referred_by: targetCode,
          points: points + 1000,
        })
        .eq("id", user?.id);

      const message = code
        ? `링크를 통해 오셨군요! 추천인(${targetCode}) 등록으로 1,000포인트가 지급되었습니다.`
        : "추천인이 등록되었습니다! 1,000포인트가 지급되었습니다.";

      Alert.alert("성공", message);
      setAlreadyReferred(true);
      fetchUserData();
    } catch (e) {
      Alert.alert("오류", "추천인 등록 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
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
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() =>
                Alert.alert("알림", "포인트 인출 기능은 현재 준비 중입니다.")
              }
            >
              <Text style={styles.withdrawBtnText}>인출하기</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pointsText}>{points.toLocaleString()} P</Text>
        </View>

        {/* 🚀 공통 동적 이벤트 배너 컴포넌트 */}
        <EventBanner
          screenType="referral"
          branchId={user?.branch_id}
          marginHorizontal={0} // content 패딩(20) 안에서 딱 맞게 떨어지도록 설정
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

  // 💡 [중복 제거 완료] 과거 하드코딩 배너 전용 파편 스타일 전체 제거

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
});
