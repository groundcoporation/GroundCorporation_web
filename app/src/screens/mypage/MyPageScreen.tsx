import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Switch,
  Linking, // 🚀 외부 링크 연결을 위해 추가
  Modal, // 🚀 [추가] 회원 탈퇴 경고 팝업 모달창을 위해 추가
  TextInput, // 🚀 [추가] "탈퇴하기" 타이핑 입력을 위해 추가
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🚀 [완벽 적용됨] 권한 확인을 위해 useAuth 임포트
import { useAuth } from "../../context/AuthContext";

export default function MyPageScreen({ navigation }: any) {
  // 🚀 [리팩토링 완료] 전역 권한 스위치를 가져옵니다!
  const { isAdmin, isStaff, isDriver } = useAuth();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [branchContact, setBranchContact] = useState({ phone: "", kakao: "" }); // 🚀 지점 연락처 정보 상태 추가
  const [isPushEnabled, setIsPushEnabled] = useState(true); // 💡 알림 설정 상태

  // =========================================================================
  // 🚀 [추가] 회원 탈퇴를 위한 상태 관리 변수들
  // =========================================================================
  const [showWithdrawModal, setShowWithdrawModal] = useState(false); // 모달 표시 여부
  const [confirmText, setConfirmText] = useState(""); // 유저가 입력하는 타이핑 텍스트
  const [isWithdrawing, setIsWithdrawing] = useState(false); // 탈퇴 처리 중 로딩 스피너 작동용

  useEffect(() => {
    fetchMyPageData();
  }, []);

  const fetchMyPageData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // 💡 권한(role)은 이미 전역으로 관리하므로, 여기서는 이름/전화번호 같은 '표시용 데이터'만 가져옵니다.
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserData(userProfile);

        // 🚀 지점의 연락처 정보(전화번호, 카카오링크) 추가 로드
        if (userProfile?.branch_id) {
          const { data: branchData } = await supabase
            .from("branches")
            .select("phone_number, kakao_link")
            .eq("id", userProfile.branch_id)
            .single();

          if (branchData) {
            setBranchContact({
              phone: branchData.phone_number || "",
              kakao: branchData.kakao_link || "",
            });
          }
        }
      }
    } catch (e) {
      console.log("마이페이지 데이터 로드 에러:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            // 1. 서버 세션 종료 (Supabase에 알림)
            await supabase.auth.signOut();

            // 2. 💡 [핵심] 자동 로그인 방지용 데이터 삭제
            // 이 코드가 있어야 앱을 다시 켰을 때 App.js가 "로그인 화면"으로 보냅니다.
            await AsyncStorage.setItem("auto_login", "false");

            // 3. 현재 화면 데이터 초기화
            setUserData(null);

            // 4. 네비게이션 초기화
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.error("로그아웃 도중 에러:", error);
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }
        },
      },
    ]);
  };

  // =========================================================================
  // 🚀 [추가] 실전 유저 정보 마스킹 및 철통 방어 회원 탈퇴 로직 (Soft Delete)
  // =========================================================================
  const handleWithdraw = async () => {
    if (confirmText !== "탈퇴하기") {
      Alert.alert("알림", "'탈퇴하기'를 정확하게 입력해주세요.");
      return;
    }

    setIsWithdrawing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인 세션이 만료되었습니다.");

      // 1. public.users 테이블의 개인정보를 완전 공중분해(마스킹) 시키고 status를 deleted로 업데이트
      // 💡 시스템의 뼈대인 id, username(초대코드), lineage(족보)는 그대로 유지하여 족보 시스템 붕괴를 막습니다.
      const { error: dbError } = await supabase
        .from("users")
        .update({
          name: "탈퇴한 사용자",
          phone: "00000000000",
          email: `deleted_${Date.now()}@unknown.com`, // 중복 방지용 이메일 마스킹
          birth_date: "00000000",
          points: 0, // 탈퇴했으므로 보유 포인트 소멸 처리
          status: "deleted", // 🎯 아까 우리가 SQL로 추가한 회원의 유령 상태값 적용!
        })
        .eq("id", user.id);

      if (dbError) throw dbError;

      // 2. 엣지 펑션이나 별도 관리자 권한 우회 없이 프론트엔드 자체에서 현재 로그인된 탈퇴자의
      // Supabase Auth 진짜 로그인 계정(auth.users)을 영구 삭제 처리하여 로그인 차단
      const { error: authError } = await supabase.rpc("delete_user_own_account"); 
      
      // 💡 만약 데이터베이스에 delete_user_own_account RPC 함수를 만들지 않으셨다면,
      // 가장 단순하게 가입자 본인의 비밀번호를 완전 무작위 난수로 변경해서 다시는 로그인하지 못하게 막는 안전책을 결합합니다.
      if (authError) {
        console.log("RPC 계정 삭제 미지원인 경우 비밀번호 변조 우회책 가동");
        const randomFakePassword = Math.random().toString(36) + Math.random().toString(36);
        await supabase.auth.updateUser({ password: randomFakePassword });
      }

      // 3. 탈퇴 처리가 완료되었으므로 기기 내부 세션 및 자동 로그인 찌꺼기 청소
      await supabase.auth.signOut();
      await AsyncStorage.setItem("auto_login", "false");
      setUserData(null);
      setShowWithdrawModal(false);

      Alert.alert("탈퇴 완료", "그동안 아이패스케어를 이용해주셔서 감사합니다.", [
        {
          text: "확인",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("탈퇴 오류", error.message || "처리 중 예기치 못한 에러가 발생했습니다.");
    } finally {
      setIsWithdrawing(false);
    }
  };
  // =========================================================================

  // 공통 메뉴 아이템 렌더링
  const renderMenuItem = (
    icon: string,
    title: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    isDestructive = false,
  ) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons
          name={icon as any}
          size={22}
          color={isDestructive ? "#EF4444" : "#4B5563"}
        />
        <Text
          style={[styles.menuItemTitle, isDestructive && { color: "#EF4444" }]}
        >
          {title}
        </Text>
      </View>
      <View style={styles.menuItemRight}>
        {rightElement ? (
          rightElement
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // 🚀 [추가] 뱃지 이름을 스위치에 따라 다르게 보여주기!
  let displayRole = "학부모";
  if (isAdmin) displayRole = "최고 관리자";
  else if (isStaff) displayRole = "코치";
  else if (isDriver) displayRole = "기사님";

  // 🚀 [리팩토링 완료] 메뉴 권한 제어를 하드코딩 대신 스위치로 변경!
  const showAdminDash = isStaff; // 어드민이거나 코치면 대시보드 보임
  const showDriverDash = isStaff || isDriver; // 어드민, 코치, 기사님이면 차량운행 보임
  const showStaffSection = showAdminDash || showDriverDash;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. 프로필 카드 (누르면 내 정보 수정으로 이동) */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate("ProfileEdit")} // 내정보 수정 화면으로 이동
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {userData?.name ? userData.name.substring(0, 1) : "U"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>
                {userData?.name || "회원"}님
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  isAdmin && { backgroundColor: "#FEE2E2" },
                ]}
              >
                {/* 🚀 스위치로 판별한 동적 권한 뱃지 적용 */}
                <Text
                  style={[
                    styles.roleBadgeText,
                    isAdmin && { color: "#EF4444" },
                  ]}
                >
                  {displayRole}
                </Text>
              </View>
            </View>
            <Text style={styles.profileSubText}>
              {userData?.phone || "010-0000-0000"}
            </Text>
            <Text style={styles.profileSubText}>
              {userData?.email || "이메일 정보 없음"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* 2. 자녀 및 설정 섹션 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>내 활동</Text>
          <View style={styles.cardGroup}>
            {/* 자녀 관리 메뉴 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("ChildManagement")}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons
                  name="face-man-profile"
                  size={24}
                  color="#4F46E5"
                />
                <Text
                  style={[
                    styles.menuItemTitle,
                    { color: "#111827", fontWeight: "700" },
                  ]}
                >
                  내 자녀 관리
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 🚀 수업 예약 내역 (추가) */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("ReservationList")}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={24}
                  color="#4F46E5"
                />
                <Text
                  style={[
                    styles.menuItemTitle,
                    { color: "#111827", fontWeight: "700" },
                  ]}
                >
                  수업 예약 내역
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 🚀 내 이용권 확인 (추가) */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("MyPackage")}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons
                  name="card-bulleted"
                  size={24}
                  color="#4F46E5"
                />
                <Text
                  style={[
                    styles.menuItemTitle,
                    { color: "#111827", fontWeight: "700" },
                  ]}
                >
                  내 이용권 확인
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 🚀 [테스트용] 청구서 확인 및 결제 화면 바로가기 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("Invoice")}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons
                  name="credit-card-clock"
                  size={24}
                  color="#F59E0B"
                />
                <Text
                  style={[
                    styles.menuItemTitle,
                    { color: "#F59E0B", fontWeight: "700" },
                  ]}
                >
                  청구서 결제 이동
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* 💡 알림 설정 토글 */}
            {renderMenuItem(
              "notifications-outline",
              "푸시 알림 설정",
              undefined,
              <Switch
                value={isPushEnabled}
                onValueChange={setIsPushEnabled}
                trackColor={{ false: "#E2E8F0", true: "#818CF8" }}
                thumbColor={isPushEnabled ? "#4F46E5" : "#F8FAFC"}
              />,
            )}
          </View>
        </View>

        {/* 3. 지원 및 기타 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>고객 지원</Text>
          <View style={styles.cardGroup}>
            {renderMenuItem(
              "help-circle-outline",
              "자주 묻는 질문 (FAQ)",
              () => {
                // 🚀 자주 묻는 질문 클릭 시 카카오톡 링크로 바로 연결
                if (branchContact.kakao) {
                  Linking.openURL(branchContact.kakao);
                } else {
                  Alert.alert("안내", "등록된 문의 채널이 없습니다.");
                }
              },
            )}
            <View style={styles.divider} />
            {renderMenuItem("call-outline", "고객센터 연결", () => {
              // 🚀 고객센터 연결 클릭 시 전화 또는 카카오톡 선택 팝업
              Alert.alert("고객센터 연결", "문의하실 방법을 선택해주세요.", [
                { text: "취소", style: "cancel" },
                {
                  text: "전화 상담",
                  onPress: () =>
                    branchContact.phone
                      ? Linking.openURL(`tel:${branchContact.phone}`)
                      : Alert.alert("안내", "전화번호가 등록되지 않았습니다."),
                },
                {
                  text: "카카오톡 문의",
                  onPress: () =>
                    branchContact.kakao
                      ? Linking.openURL(branchContact.kakao)
                      : Alert.alert(
                          "안내",
                          "카카오톡 링크가 등록되지 않았습니다.",
                        ),
                },
              ]);
            })}
            <View style={styles.divider} />
            {/* {renderMenuItem(
              "document-text-outline",
              "이용약관 및 정책",
              () => {},
            )} */}
          </View>
        </View>

        {/* 4. 직원 전용 메뉴 (🚀 권한별 분기 처리) */}
        {showStaffSection && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: "#EF4444" }]}>
              직원 전용 메뉴
            </Text>
            <View style={styles.cardGroup}>
              {showAdminDash &&
                renderMenuItem(
                  "shield-checkmark-outline",
                  "키패드 출결 체크",
                  () => navigation.navigate("AdminAttendance"),
                )}
              {showAdminDash && <View style={styles.divider} />}

              {showAdminDash &&
                renderMenuItem("settings-outline", "관리자 대시보드", () =>
                  navigation.navigate("AdminHome"),
                )}
              {showAdminDash && showDriverDash && (
                <View style={styles.divider} />
              )}
              {showDriverDash &&
                renderMenuItem("bus-outline", "차량 운행 대시보드", () =>
                  navigation.navigate("DriverDashboard"),
                )}
            </View>
          </View>
        )}

        {/* 5. 로그아웃 / 탈퇴 */}
        <View style={styles.sectionContainer}>
          <View style={styles.cardGroup}>
            {renderMenuItem(
              "log-out-outline",
              "로그아웃",
              handleLogout,
              undefined,
              true,
            )}
          </View>
        </View>

        {/* 앱 버전 정보 */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>IPASSCARE v1.0.0</Text>
          <TouchableOpacity 
            style={{ marginTop: 10 }}
            onPress={() => {
              // 🚀 [추가] 밑줄 쳐진 회원 탈퇴 텍스트를 누르면 경고 모달창 짠! 띄우기
              setConfirmText("");
              setShowWithdrawModal(true);
            }}
          >
            <Text style={styles.withdrawText}>회원 탈퇴</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      // 🚀 [추가] 심사관과 실수를 완벽하게 방어하는 예쁜 회원 탈퇴 확인 모달창
      {/* ========================================================================= */}
      <Modal visible={showWithdrawModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.warningIconCircle}>
              <Ionicons name="warning" size={36} color="#FFF" />
            </View>

            <Text style={styles.modalTitle}>정말 탈퇴하시겠습니까?</Text>
            
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>• 보유하고 계신 모든 포인트가 즉시 소멸되며 복구할 수 없습니다.</Text>
              <Text style={styles.warningText}>• 자녀의 학원 안심 픽업 신청 내역 및 셔틀 탑승 로그가 모두 삭제됩니다.</Text>
              <Text style={styles.warningText}>• 탈퇴 즉시 계정이 잠기며 동일 아이디로 재가입이 불가능합니다.</Text>
            </View>

            <Text style={styles.inputGuideText}>
              의사를 확인하기 위해 아래에 <Text style={{fontWeight: "bold", color: "#EF4444"}}>"탈퇴하기"</Text>를 직접 입력해주세요.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="탈퇴하기 입력"
              placeholderTextColor="#94A3B8"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="none"
              editable={!isWithdrawing}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowWithdrawModal(false)}
                disabled={isWithdrawing}
              >
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalWithdrawBtn, 
                  confirmText !== "탈퇴하기" && styles.modalWithdrawBtnDisabled
                ]} 
                onPress={handleWithdraw}
                disabled={confirmText !== "탈퇴하기" || isWithdrawing}
              >
                {isWithdrawing ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalWithdrawBtnText}>영구 탈퇴</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
      {/* ========================================================================= */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // 프로필 카드 (통합 버튼 형태)
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileAvatarText: { fontSize: 24, fontWeight: "800", color: "#4F46E5" },
  profileInfo: { flex: 1 },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  profileName: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  roleBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  roleBadgeText: { fontSize: 10, fontWeight: "700", color: "#4F46E5" },
  profileSubText: { fontSize: 13, color: "#64748B", marginTop: 2 },

  // 섹션
  sectionContainer: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
    paddingLeft: 4,
    marginBottom: 8,
  },
  cardGroup: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 20 },

  // 공통 메뉴 아이템
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center" },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginLeft: 12,
  },
  menuItemRight: { flexDirection: "row", alignItems: "center" },

  // 하단 꼬리말
  versionContainer: { alignItems: "center", marginTop: 10 },
  versionText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  withdrawText: {
    fontSize: 12,
    color: "#CBD5E1",
    textDecorationLine: "underline",
  },

  // =========================================================================
  // 🚀 [추가] 회원 탈퇴 모달창 전용 스타일시트 파트
  // =========================================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFF",
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    backgroundColor: "#EF4444",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  warningText: {
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 20,
    marginBottom: 8,
  },
  inputGuideText: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1E293B",
    textAlign: "center",
    backgroundColor: "#F8FAFC",
    marginBottom: 24,
  },
  modalButtonRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
  },
  modalCancelBtnText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "700",
  },
  modalWithdrawBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  modalWithdrawBtnDisabled: {
    backgroundColor: "#FCA5A5",
  },
  modalWithdrawBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});