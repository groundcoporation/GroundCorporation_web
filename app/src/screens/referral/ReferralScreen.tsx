import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function ReferralScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [myReferralCode, setMyReferralCode] = useState("");
  const [referrerInput, setReferrerInput] = useState("");
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyReferred, setAlreadyReferred] = useState(false);

  // 🚀 [추가] 딥링크 등을 통해 전달받은 추천인 코드 확인
  const initialReferralCode = route?.params?.referralCode;

  useEffect(() => {
    if (user) fetchUserData();
  }, [user]);

  // 🚀 [추가] 전달받은 코드가 있고 아직 추천인 등록 전이라면 자동 실행
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
    const { data, error } = await supabase
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
    //  플레이 스토어 링크로 수정 (referrer 파라미터에 추천인 코드 포함)
    const playStoreLink = `https://play.google.com/store/apps/details?id=com.goundcorp.ipasscare&referrer=${myReferralCode}`;

    try {
      await Share.share({
        message: `[아이패스케어] 저와 함께 시작해요! 첫 결제 1% 할인 혜택도 드려요.\n\n추천인 코드: ${myReferralCode}\n지금 다운로드: ${playStoreLink}`,
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
      // 1. 추천인 존재 여부 확인 (ilike를 사용하여 대소문자 구분 없이 검색)
      const { data: referrer, error: refError } = await supabase
        .from("users")
        .select("id, points")
        .ilike("username", targetCode)
        .maybeSingle();

      if (refError) {
        console.error("추천인 조회 에러:", refError.message);
        Alert.alert(
          "오류",
          "사용자 조회 중 문제가 발생했습니다. (RLS 또는 컬럼 확인 필요)",
        );
        return;
      }

      if (!referrer) {
        Alert.alert("오류", "존재하지 않는 사용자 아이디입니다.");
        return;
      }

      // 2. 포인트 지급 및 업데이트
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
          <Text style={styles.label}>나의 보유 포인트</Text>
          <Text style={styles.pointsText}>{points.toLocaleString()} P</Text>
        </View>

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
              다음 상품 결제 시 1% 할인 혜택이 적용됩니다!
            </Text>
          </View>
        )}
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
    alignItems: "center",
    marginBottom: 25,
    elevation: 5,
  },
  label: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 5 },
  pointsText: { color: "#fff", fontSize: 32, fontWeight: "900" },
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
});
