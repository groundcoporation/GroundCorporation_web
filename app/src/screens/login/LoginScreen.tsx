import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal, // 🚀 [추가] 예쁜 팝업을 띄우기 위한 컴포넌트
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// 🚀 [추가] 진짜 토큰 발급을 위한 엑스포 라이브러리 임포트
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// 🚀 [추가됨] 방금 만든 전역 상태 보관소에서 useAuth 가져오기
import { useAuth } from "../../context/AuthContext";

const EAS_PROJECT_ID = "de548348-97b7-4c03-aebd-2cddafdba3d4";

const getEasProjectId = () =>
  Constants.easConfig?.projectId ||
  Constants.expoConfig?.extra?.eas?.projectId ||
  EAS_PROJECT_ID;

export default function LoginScreen({ navigation }: any) {
  // 사용자가 입력하는 값 (아이디 또는 이메일)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 💡 비밀번호 보이기 상태 추가

  // 🚀 [추가됨] 전역 상태를 수동으로 새로고침하는 함수 꺼내기
  const { refreshAuth } = useAuth();

  // =========================================================================
  // 🚀 [추가] 가입 유도 팝업창을 위한 상태 변수들
  // =========================================================================
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState<"general" | "referral" | null>(null);
  const [popupReferralCode, setPopupReferralCode] = useState("");
  const [signupBonus, setSignupBonus] = useState(1000); // DB에서 가져올 혜택금

  useEffect(() => {
    loadSavedCredentials();
    checkWelcomePopup(); // 🚀 [추가] 화면이 켜지면 팝업 띄울지 검사 시작
  }, []);

  // =========================================================================
  // 🚀 [추가] IP 스캔 및 팝업 노출 여부 결정 로직
  // =========================================================================
  const checkWelcomePopup = async () => {
    try {
      // 1. '오늘 하루 안 보기' 설정 검사
      const today = new Date().toISOString().split("T")[0]; // 예: "2026-06-11"
      const hideDate = await AsyncStorage.getItem("hide_signup_popup_date");
      if (hideDate === today) return; // 오늘 안 보기 설정했으면 바로 종료

      // 2. DB에서 가입 축하금(signup_bonus) 실시간으로 가져오기
      const { data: pointData } = await supabase
        .from("point_settings")
        .select("value")
        .eq("key", "signup_bonus")
        .maybeSingle();
      
      const currentBonus = Number(pointData?.value) || 1000;
      setSignupBonus(currentBonus);

      // 3. 내 스마트폰의 현재 접속 IP 가져오기 (무료 IP 확인 API 활용)
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      const myIp = ipData.ip;

      // 4. 최근 30분 이내에 내 IP로 저장된 추천 링크 클릭 흔적이 있는지 DB 검색
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: redirectData } = await supabase
        .from("temp_redirects")
        .select("referral_code")
        .eq("ip_address", myIp)
        .gte("created_at", thirtyMinsAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 5. 결과에 따라 맞춤형 팝업 세팅
      if (redirectData && redirectData.referral_code) {
        setPopupType("referral");
        setPopupReferralCode(redirectData.referral_code);
      } else {
        setPopupType("general");
      }

      // 팝업 짠! 띄우기
      setShowPopup(true);
    } catch (error) {
      console.log("팝업 검사 중 에러 (조용히 무시):", error);
      // 에러가 나도 로그인은 되어야 하므로 팝업만 안 띄우고 패스합니다.
    }
  };

  // 🚀 [추가] 오늘 하루 보지 않기 처리 함수
  const handleHidePopupToday = async () => {
    const today = new Date().toISOString().split("T")[0];
    await AsyncStorage.setItem("hide_signup_popup_date", today);
    setShowPopup(false);
  };

  // 🚀 [추가] 팝업에서 가입하기 버튼 누를 때 (추천인 코드 넘겨주기)
  const handleGoToSignUp = () => {
    setShowPopup(false);
    navigation.navigate("SignUp", {
      referralCode: popupType === "referral" ? popupReferralCode : undefined,
    });
  };
  // =========================================================================

  const loadSavedCredentials = async () => {
    try {
      const savedId = await AsyncStorage.getItem("saved_id");
      const savedRememberId =
        (await AsyncStorage.getItem("remember_id")) === "true";
      const savedAutoLogin =
        (await AsyncStorage.getItem("auto_login")) === "true";

      setRememberId(savedRememberId);
      setAutoLogin(savedAutoLogin);
      if (savedRememberId && savedId) {
        setIdentifier(savedId);
      }
    } catch (e) {
      console.log("불러오기 에러:", e);
    }
  };

  const saveCredentials = async () => {
    try {
      await AsyncStorage.setItem("remember_id", rememberId.toString());
      await AsyncStorage.setItem("auto_login", autoLogin.toString());
      if (rememberId) {
        await AsyncStorage.setItem("saved_id", identifier.trim());
      } else {
        await AsyncStorage.removeItem("saved_id");
      }
    } catch (e) {
      console.log("저장 에러:", e);
    }
  };

  /**
   * 🚀 아이디 -> 이메일 변환 후 로그인 로직
   */
  const handleSignIn = async () => {
    if (!identifier || !password) {
      Alert.alert("알림", "아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      let loginEmail = identifier.trim();

      // 1. 입력된 값이 이메일 형식이 아닐 경우 (@가 없을 경우)
      if (!loginEmail.includes("@")) {
        // public.users 테이블에서 username이 일치하는 사용자의 email을 가져옵니다.
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email")
          .eq("username", loginEmail)
          .maybeSingle();

        if (userError || !userData) {
          Alert.alert("로그인 실패", "존재하지 않는 아이디입니다.");
          setIsLoading(false);
          return;
        }

        // DB에서 찾은 이메일로 교체
        loginEmail = userData.email;
      }

      // 2. 최종 결정된 이메일과 비밀번호로 Supabase Auth 로그인
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) {
        Alert.alert("로그인 실패", "아이디 또는 비밀번호가 일치하지 않습니다.");
        setIsLoading(false);
        return;
      }

      // 🚀 [추가됨] 로그인 성공 직후, 지점 정보와 권한을 DB에서 가져와 전역 상태에 업데이트!
      // 이 과정이 끝나야 완벽하게 현재 지점을 앱이 기억하게 됩니다.
      await refreshAuth();

      // // =========================================================================
      // // 🚨🚨🚨 [임시 우회 알림 테스트 코드] 알림 빌드 성공하면 이 구간만 통째로 삭제!! 🚨🚨🚨
      // // =========================================================================
      // // if (data?.user?.id) {
      // //   const fakeToken = "ExponentPushToken[FakeTokenForTesting123]"; // 가짜 토큰 생성

      // //   const { error: tokenError } = await supabase
      // //     .from('users')
      // //     .update({ push_token: fakeToken }) // 👈 본부장님 DB의 실제 푸시토큰 컬럼명
      // //     .eq('id', data.user.id);

      // //   if (tokenError) {
      // //     console.log('🚨 Supabase 가짜 토큰 저장 실패:', tokenError.message);
      // //   } else {
      // //     console.log('🎉 [대성공] 가짜 토큰이 무선 인터넷을 타고 Supabase에 저장되었습니다!');
      // //   }
      // // }
      // // =========================================================================
      // // 🚨🚨🚨 [임시 우회 알림 테스트 코드 끝] 🚨🚨🚨

      // =========================================================================
      // 🚀 [정상 루트] 로그인 성공 시 진짜 푸시 토큰 발급 및 DB 저장
      // =========================================================================
      if (data?.user?.id) {
        try {
          // 1. 기기에서 진짜 Expo 푸시 토큰을 발급받습니다.
          const tokenResponse = await Notifications.getExpoPushTokenAsync({
            projectId: getEasProjectId(),
          });
          const realToken = tokenResponse.data;

          // 2. 발급받은 진짜 토큰을 Supabase DB의 내 계정에 쏙 집어넣습니다.
          const { error: realTokenError } = await supabase
            .from("users")
            .update({ push_token: realToken })
            .eq("id", data.user.id);

          if (realTokenError) {
            console.log(
              "🚨 Supabase 진짜 토큰 저장 실패:",
              realTokenError.message,
            );
          } else {
            console.log(
              "🎉 [대성공] 진짜 토큰 발급 및 저장 완료! 팝업 쏠 준비 끝! 👉",
              realToken,
            );
          }
        } catch (tokenFetchError) {
          console.log("🚨 진짜 토큰 발급 중 에러 발생:", tokenFetchError);
        }
      }
      // =========================================================================

      // 3. 성공 시 처리
      await saveCredentials();
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } catch (error: any) {
      Alert.alert("에러", "로그인 중 예기치 못한 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>학부모 계정으로 로그인하세요.</Text>

      <TextInput
        style={styles.input}
        placeholder="아이디" // 👈 이메일 문구 삭제
        placeholderTextColor="#999" // 🚀 [추가] 다크 모드 가독성을 위해 플레이스홀더 색상 고정
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />

      {/* 💡 비밀번호 입력 섹션 (눈 모양 아이콘 추가) */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="비밀번호"
          placeholderTextColor="#999" // 🚀 [추가] 다크 모드 가독성을 위해 플레이스홀더 색상 고정
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword} // 💡 showPassword 상태에 따라 가림/보임
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-outline" : "eye-off-outline"}
            size={22}
            color="#888"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkboxWrapper}
          onPress={() => {
            setRememberId(!rememberId);
            if (rememberId) setAutoLogin(false);
          }}
        >
          <Ionicons
            name={rememberId ? "checkbox" : "square-outline"}
            size={20}
            color="teal"
          />
          <Text style={styles.checkboxText}>아이디 기억하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxWrapper}
          onPress={() => {
            setAutoLogin(!autoLogin);
            if (!autoLogin) setRememberId(true);
          }}
        >
          <Ionicons
            name={autoLogin ? "checkbox" : "square-outline"}
            size={20}
            color="teal"
          />
          <Text style={styles.checkboxText}>자동 로그인</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
        onPress={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginButtonText}>로그인</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
          <Text style={styles.linkTextBlue}>간편 회원가입</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("FindAuth")}>
          <Text style={styles.linkTextGrey}>아이디/비밀번호 찾기</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* 🚀 [추가] 예쁜 마케팅 가입 팝업 모달창 */}
      {/* ========================================================================= */}
      <Modal visible={showPopup} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* 팝업 아이콘 영역 */}
            <View style={styles.iconCircle}>
              <Ionicons name="gift" size={40} color="#fff" />
            </View>

            {/* 맞춤형 텍스트 영역 */}
            {popupType === "referral" ? (
              <>
                <Text style={styles.popupTitle}>특별한 초대장이 도착했어요!</Text>
                <Text style={styles.popupDesc}>
                  <Text style={styles.highlightText}>{popupReferralCode}</Text> 님의 초대로 오셨군요.{"\n"}지금 가입하시면 축하금{" "}
                  <Text style={styles.highlightText}>{signupBonus.toLocaleString()}P</Text>를 즉시 드립니다!
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.popupTitle}>아이패스케어에 오신 걸 환영합니다!</Text>
                <Text style={styles.popupDesc}>
                   아직 회원이 아니신가요?{"\n"}지금 가입하시면 현금처럼 쓰는{" "}
                  <Text style={styles.highlightText}>{signupBonus.toLocaleString()}P</Text>를 즉시 드립니다!
                </Text>
              </>
            )}

            {/* 버튼 영역 */}
            <TouchableOpacity style={styles.popupMainBtn} onPress={handleGoToSignUp}>
              <Text style={styles.popupMainBtnText}>혜택 받고 가입하기</Text>
            </TouchableOpacity>

            <View style={styles.popupFooterRow}>
              <TouchableOpacity onPress={handleHidePopupToday}>
                <Text style={styles.popupSubBtnText}>오늘 하루 보지 않기</Text>
              </TouchableOpacity>
              <Text style={styles.popupDivider}>|</Text>
              <TouchableOpacity onPress={() => setShowPopup(false)}>
                <Text style={styles.popupSubBtnText}>닫기</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
    color: '#000', // 🚀 추가: 제목 색상 고정
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#000', // 🚀 추가: 입력창 텍스트 색상 고정
    backgroundColor: '#fff', // 배경색 명시
  },

  // 💡 비밀번호 입력창 스타일 추가
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#000', // 🚀 추가: 비밀번호 입력창 텍스트 색상 고정
  },
  eyeIcon: {
    padding: 10,
    marginRight: 5,
  },

  checkboxContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  checkboxWrapper: { flexDirection: "row", alignItems: "center" },
  checkboxText: { marginLeft: 8, fontSize: 14, color: '#000' }, // 🚀 추가: 체크박스 텍스트 색상 고정
  loginButton: {
    backgroundColor: "teal",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    // 🎯 TouchablOpacity 컨테이너의 잘못된 color 속성 제거 완료
  },
  loginButtonDisabled: { backgroundColor: "#a0c4c4" },
  loginButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  linkContainer: { flexDirection: "row", justifyContent: "space-between" },
  linkTextBlue: { color: "#007AFF", fontSize: 14 },
  linkTextGrey: { color: "grey", fontSize: 14 },

  // =========================================================================
  // 🚀 [추가] 팝업창 디자인 스타일
  // =========================================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 70,
    height: 70,
    backgroundColor: "teal",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: -10, // 살짝 위로 띄워서 강조
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 10,
    textAlign: "center",
  },
  popupDesc: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  highlightText: {
    color: "teal",
    fontWeight: "bold",
    fontSize: 15,
  },
  popupMainBtn: {
    backgroundColor: "teal",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  popupMainBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  popupFooterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  popupSubBtnText: {
    color: "#888",
    fontSize: 13,
  },
  popupDivider: {
    color: "#ddd",
    marginHorizontal: 15,
  },
});
