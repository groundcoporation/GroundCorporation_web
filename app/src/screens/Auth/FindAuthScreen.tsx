import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // 경로에 맞게 수정해주세요

// 이메일 마스킹 함수 (예: abcd@gmail.com -> ab***@gmail.com)
const maskEmail = (email: string) => {
  if (!email || !email.includes("@")) return email;
  const [id, domain] = email.split("@");
  if (id.length <= 2) return `${id}***@${domain}`;
  return `${id.substring(0, 2)}***@${domain}`;
};

export default function FindAuthScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<"ID" | "PW">("ID");
  const [isLoading, setIsLoading] = useState(false);

  // 폼 상태
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");

  const [foundId, setFoundId] = useState<string | null>(null);

  // 💡 1. 아이디 찾기 로직 (이름 + 휴대폰 번호)
  const handleFindId = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("알림", "이름과 휴대폰 번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setFoundId(null);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("name", name.trim())
        .eq("phone", phone.trim().replace(/[^0-9]/g, "")) // 숫자만 추출해서 비교
        .maybeSingle();

      if (error || !data) {
        Alert.alert("조회 실패", "입력하신 정보와 일치하는 계정이 없습니다.");
      } else {
        setFoundId(data.username);
      }
    } catch (e: any) {
      Alert.alert("에러", "아이디 찾기 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 2. 비밀번호 찾기 로직 (아이디 + 휴대폰 번호)
  const handleFindPw = async () => {
    if (!username.trim() || !phone.trim()) {
      Alert.alert("알림", "아이디와 휴대폰 번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. 아이디와 휴대폰 번호로 유저의 이메일 찾기
      const { data, error } = await supabase
        .from("users")
        .select("email")
        .eq("username", username.trim())
        .eq("phone", phone.trim().replace(/[^0-9]/g, ""))
        .maybeSingle();

      if (error || !data || !data.email) {
        Alert.alert("조회 실패", "입력하신 정보와 일치하는 계정이 없습니다.");
        setIsLoading(false);
        return;
      }

      const userEmail = data.email;
      const maskedEmail = maskEmail(userEmail);

      // 2. Supabase 비밀번호 재설정 이메일 발송
      // redirectTo는 나중에 앱으로 다시 돌아오기 위한 딥링크입니다 (app.json 설정에 맞춤)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: "myapp://reset-password", 
      });

      if (resetError) {
        Alert.alert("발송 실패", "이메일 발송에 실패했습니다. 다시 시도해주세요.");
      } else {
        Alert.alert(
          "이메일 발송 완료",
          `가입하신 이메일(${maskedEmail})로\n비밀번호 재설정 링크를 발송했습니다.\n이메일을 확인해주세요.`,
          [{ text: "확인", onPress: () => navigation.goBack() }]
        );
      }
    } catch (e: any) {
      Alert.alert("에러", "비밀번호 찾기 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>아이디 / 비밀번호 찾기</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          
          {/* 탭 메뉴 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "ID" && styles.activeTab]}
              onPress={() => {
                setActiveTab("ID");
                setFoundId(null);
              }}
            >
              <Text style={[styles.tabText, activeTab === "ID" && styles.activeTabText]}>아이디 찾기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "PW" && styles.activeTab]}
              onPress={() => setActiveTab("PW")}
            >
              <Text style={[styles.tabText, activeTab === "PW" && styles.activeTabText]}>비밀번호 찾기</Text>
            </TouchableOpacity>
          </View>

          {/* 콘텐츠 영역 */}
          <View style={styles.content}>
            
            {/* 💡 아이디 찾기 폼 */}
            {activeTab === "ID" && (
              <View>
                <Text style={styles.description}>가입 시 등록한 이름과 휴대폰 번호를 입력해주세요.</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="이름 (예: 홍길동)"
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="휴대폰 번호 (- 없이 입력)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="number-pad"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                  onPress={handleFindId}
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>아이디 찾기</Text>}
                </TouchableOpacity>

                {/* 결과 표시 */}
                {foundId && (
                  <View style={styles.resultBox}>
                    <Text style={styles.resultLabel}>회원님의 아이디는</Text>
                    <Text style={styles.resultValue}>{foundId}</Text>
                    <Text style={styles.resultLabel}>입니다.</Text>
                    
                    <TouchableOpacity style={styles.loginGoBtn} onPress={() => navigation.goBack()}>
                      <Text style={styles.loginGoBtnText}>로그인하러 가기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 💡 비밀번호 찾기 폼 */}
            {activeTab === "PW" && (
              <View>
                <Text style={styles.description}>가입하신 아이디와 휴대폰 번호를 입력하시면,{'\n'}연결된 이메일로 재설정 링크를 보내드립니다.</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="아이디"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="휴대폰 번호 (- 없이 입력)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="number-pad"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                  onPress={handleFindPw}
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>비밀번호 재설정 이메일 받기</Text>}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  tabContainer: { flexDirection: "row", backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tabButton: { flex: 1, paddingVertical: 16, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: "teal" },
  tabText: { fontSize: 16, fontWeight: "600", color: "#94A3B8" },
  activeTabText: { color: "teal", fontWeight: "800" },
  
  content: { padding: 24 },
  description: { fontSize: 14, color: "#64748B", marginBottom: 20, lineHeight: 20 },
  
  input: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, padding: 16, marginBottom: 12, fontSize: 16 },
  
  submitBtn: { backgroundColor: "teal", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 8 },
  submitBtnDisabled: { backgroundColor: "#A0C4C4" },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "800" },
  
  resultBox: { marginTop: 30, backgroundColor: "#FFF", padding: 24, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  resultLabel: { fontSize: 15, color: "#475569", marginBottom: 8 },
  resultValue: { fontSize: 24, fontWeight: "800", color: "teal", marginBottom: 8 },
  loginGoBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#EEF2FF", borderRadius: 8 },
  loginGoBtnText: { color: "teal", fontWeight: "700", fontSize: 15 }
});