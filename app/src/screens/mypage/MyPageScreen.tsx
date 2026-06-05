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
          <TouchableOpacity style={{ marginTop: 10 }}>
            <Text style={styles.withdrawText}>회원 탈퇴</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
});
