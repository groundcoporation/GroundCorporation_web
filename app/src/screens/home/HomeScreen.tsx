import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  FlatList,
  Linking,
  ImageBackground,
  ActivityIndicator, // 🚀 로딩 표시를 위해 추가
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// 🚀 [추가] 지점 정보를 가져오기 위해 useAuth 임포트
import { useAuth } from "../../context/AuthContext";

// 🚀 [추가] 화면이 유저 눈에 보일 때마다 자동 새로고침을 수행하기 위해 useIsFocused 임포트
import { useIsFocused } from "@react-navigation/native";

// 🚀 [팝업 관리자 임포트] 유니폼 및 공지사항 통제
import PopupManager from "../../components/popups/PopupManager";
// 🚀 [알림 종 임포트] 실시간 알림 및 모달 기능 추가
import NotificationBell from "../../components/notification/NotificationBell";

// 💡 biz_info 데이터 타입에 이용약관 및 개인정보 링크 추가
interface BizInfo {
  ceo: string;
  biz_no: string;
  address: string;
  contact: string; // 👈 고객센터 연락처 추가
  tongshin_no: string;
  company_name: string;

  terms_url?: string; // 👈 지점별 이용약관 링크 (선택형 폴백 처리)
  privacy_url?: string; // 👈 지점별 개인정보 처리방침 링크 (선택형 폴백 처리)
  escrow_no?: string;
}

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }: any) {
  // 🚀 [추가] 전역 지점 ID 호출
  const { branchId } = useAuth();

  // 🚀 [추가] 화면 포커스 여부 감시 센서 선언 (유저 눈에 홈 화면이 띄워져 있는지 감지)
  const isFocused = useIsFocused();

  const [userData, setUserData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  // 💡 새로 추가된 상태: 가장 가까운 예약 데이터
  const [upcomingReservation, setUpcomingReservation] = useState<any>(null);

  // 💡 지점별 사업자 정보를 저장할 상태 추가
  const [bizInfo, setBizInfo] = useState<BizInfo | null>(null);

  // 🚀 [추가] 홈 화면에 표시할 공지사항 상태 (최신 2개)
  const [homeNotices, setHomeNotices] = useState<any[]>([]);

  // 🚀 [수정] branchId가 변경되거나 화면이 유저 눈앞에 다시 포커스될 때마다 데이터를 실시간 갱신합니다.
  useEffect(() => {
    if (branchId && isFocused) {
      console.log(
        "🏠 [포커스 감지] 홈 화면 진입 또는 리턴이 확인되어 최신 데이터를 새로고침합니다.",
      );
      fetchData();
    }
  }, [branchId, isFocused]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // 1. 유저 정보 로드 (소속 지점 포함)
        const { data: userProfile } = await supabase
          .from("users")
          .select("*, branches(name)")
          .eq("id", user.id)
          .single();
        setUserData(userProfile);

        // 💡 1-2. 유저의 지점 ID를 기반으로 지점의 biz_info(사업자 정보) 로드
        // 🚀 [수정] 전역 branchId를 우선적으로 사용하도록 변경
        const targetBranchId = branchId || userProfile?.branch_id || "main";

        let { data: branchData } = await supabase
          .from("branches")
          .select("biz_info")
          .eq("id", targetBranchId)
          .single();

        // 만약 해당 지점 ID로 데이터를 못 찾았다면 첫 번째 지점 정보 자동 로드
        if (!branchData || !branchData.biz_info) {
          const { data: fallbackBranch } = await supabase
            .from("branches")
            .select("biz_info")
            .limit(1)
            .maybeSingle();
          branchData = fallbackBranch;
        }

        if (branchData && branchData.biz_info) {
          setBizInfo(branchData.biz_info as BizInfo);
        }

        // 2. 자녀 정보 로드
        const { data: childrenList } = await supabase
          .from("children")
          .select("*")
          .eq("parent_id", user.id)
          .order("created_at", { ascending: true });
        setChildren(childrenList || []);

        // 💡 3. [수정] 다가오는 예약 로드 (오늘 이후의 가장 빠른 예약 1건 + 수업 상세 정보 JOIN)
        const today = new Date().toISOString().split("T")[0];

        const { data: reservation } = await supabase
          .from("reservations")
          .select(
            `
          *,
          branches ( name ), 
          class_schedules (
            target_class,
            start_time,
            end_time
          )
        `,
          )
          .eq("user_id", user.id)
          .gte("class_date", today)
          .eq("status", "pending")
          .order("class_date", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (reservation) {
          setUpcomingReservation(reservation);
        } else {
          setUpcomingReservation(null);
        }

        // 🚀 [추가] 4. 홈 화면 공지사항 로드 (is_on_home이 true인 것 중 최신 2개)
        const { data: notices } = await supabase
          .from("notices")
          .select("*")
          .eq("is_on_home", true) // 홈 노출 설정된 것만
          .or(`branch_id.eq.${branchId},branch_id.is.null`) // 내 지점이거나 전체공지
          .order("is_important", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(2);

        setHomeNotices(notices || []);
      }
    } catch (e) {
      console.log("데이터 로드 에러:", e);
    } finally {
      setLoading(false);
    }
  };

  // 💡 예약 날짜와 수업 시간을 합쳐서 포맷 (예: 05.01 WED 14:00)
  const formatReservationDate = (dateString: string, startTime: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const dayOfWeek = days[date.getDay()];

    const time = startTime ? startTime.slice(0, 5) : "";

    return `${month}.${day} ${dayOfWeek} ${time}`;
  };

  const renderLessonCard = (targetName: string, isChild: boolean) => {
    const hasReservation = !!upcomingReservation;

    return (
      <View style={styles.cardShadow}>
        {hasReservation ? (
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800",
            }}
            style={styles.cardInner}
            imageStyle={{ borderRadius: 16 }}
          >
            <View style={styles.cardOverlay} />
            <View style={styles.cardContent}>
              <View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>UPCOMING</Text>
                </View>
                {/* 💡 [수정] 예약된 날짜와 수업 시간을 정확히 표시 */}
                <Text style={styles.cardDateText}>
                  {formatReservationDate(
                    upcomingReservation.class_date,
                    upcomingReservation.class_schedules?.start_time,
                  )}
                </Text>
                <Text style={styles.cardChildText}>
                  {upcomingReservation.class_schedules?.target_class} |{" "}
                  {targetName} {isChild ? "학생" : "회원님"}
                </Text>
                {/* 💡 [수정] '미정' 방지: 예약 데이터의 지점 정보를 먼저 보여줌 */}
                <Text style={styles.branchText}>
                  {/* 1순위: 예약된 수업의 지점 한글명 / 2순위: 내 소속 지점 한글명 / 3순위: 기본값 */}
                  {upcomingReservation?.branches?.name ||
                    userData?.branches?.name ||
                    "시흥본점"}
                </Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.cardInner, styles.emptyCard]}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={32}
              color="#D1D5DB"
            />
            <Text style={[styles.emptyText, { marginTop: 8 }]}>
              예정된 수업이 없습니다.
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 12,
                paddingVertical: 8,
                paddingHorizontal: 16,
                backgroundColor: "#4F46E5",
                borderRadius: 8,
              }}
              onPress={() => navigation.navigate("Reservation")}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>
                예약하러 가기
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* AppBar */}
      <View style={styles.appBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoBrandText}>
            IPASS<Text style={styles.logoBrandAccent}>CARE</Text>
          </Text>
        </View>
        <View style={styles.appBarActions}>
          {/* 🚀 [변경] 기존 단순 아이콘+배지 코드를 NotificationBell 컴포넌트로 교체 */}
          <NotificationBell />

          <TouchableOpacity
            style={[styles.iconCircle, { marginLeft: 12 }]}
            onPress={() => navigation.navigate("MyPage")}
          >
            <Ionicons name="person-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.mainPadding}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeName}>
              {userData?.name || "사용자"}님
            </Text>
            <Text style={styles.welcomeMsg}>오늘의 일정을 확인하세요.</Text>
          </View>

          {/* 1. Schedule Cards */}
          <View style={styles.pageViewSection}>
            <FlatList
              data={children.length > 0 ? children : [userData]}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / (width - 48),
                );
                setActiveChildIndex(index);
              }}
              renderItem={({ item }) => (
                <View style={styles.cardWrapper}>
                  {item ? (
                    renderLessonCard(
                      item.name || item.child_name,
                      children.length > 0,
                    )
                  ) : (
                    <View style={[styles.cardInner, styles.emptyCard]}>
                      <Text style={styles.emptyText}>
                        등록된 일정이 없습니다.
                      </Text>
                    </View>
                  )}
                </View>
              )}
              keyExtractor={(item, index) => item?.id || index.toString()}
            />
            {children.length > 1 && (
              <View style={styles.dotRow}>
                {children.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      activeChildIndex === i && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* 2. Quick Menu */}
          <View style={styles.quickMenuGrid}>
            {/* 1. 수업 예약 - 빨강 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("Reservation")}
            >
              <View
                style={[styles.menuIconBg, { backgroundColor: "#FF4B4B15" }]}
              >
                <MaterialCommunityIcons
                  name="calendar-plus"
                  size={28}
                  color="#FF4B4B"
                />
              </View>
              <Text style={[styles.menuLabel, { color: "#FF4B4B" }]}>
                수업 예약
              </Text>
            </TouchableOpacity>

            {/* 2. 이용권 구매 - 주황 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("Pass")}
            >
              <View
                style={[styles.menuIconBg, { backgroundColor: "#FF9F4315" }]}
              >
                <MaterialCommunityIcons
                  name="ticket-confirmation-outline"
                  size={28}
                  color="#FF9F43"
                />
              </View>
              <Text style={[styles.menuLabel, { color: "#FF9F43" }]}>
                이용권 구매
              </Text>
            </TouchableOpacity>

            {/* 3. 이용권 확인 - 노랑 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("MyPackage")}
            >
              <View
                style={[styles.menuIconBg, { backgroundColor: "#FFD93D15" }]}
              >
                <MaterialCommunityIcons
                  name="ticket-account"
                  size={28}
                  color="#FFD93D"
                />
              </View>
              <Text style={[styles.menuLabel, { color: "#EAB308" }]}>
                이용권 확인
              </Text>
            </TouchableOpacity>

            {/* 4. 쇼핑몰 - 초록 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL("http://vog-sports.com/")}
            >
              <View
                style={[styles.menuIconBg, { backgroundColor: "#6BCB7715" }]}
              >
                <MaterialCommunityIcons
                  name="shopping-outline"
                  size={28}
                  color="#6BCB77"
                />
              </View>
              <Text style={[styles.menuLabel, { color: "#6BCB77" }]}>
                쇼핑몰
              </Text>
            </TouchableOpacity>

            {/* 5. 갤러리 - 파랑 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("GalleryList")}
            >
              <View
                style={[styles.menuIconBg, { backgroundColor: "#4D96FF15" }]}
              >
                <MaterialCommunityIcons
                  name="image-outline"
                  size={28}
                  color="#4D96FF"
                />
              </View>
              <Text style={[styles.menuLabel, { color: "#4D96FF" }]}>
                갤러리
              </Text>
            </TouchableOpacity>

            {/* 6. 픽업 - 남색 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("PickupMain")}
            >
              <View
                style={[styles.menuIconBg, { backgroundColor: "#3D56B215" }]}
              >
                <MaterialCommunityIcons
                  name="bus-school"
                  size={28}
                  color="#3D56B2"
                />
              </View>
              <Text style={[styles.menuLabel, { color: "#3D56B2" }]}>픽업</Text>
            </TouchableOpacity>

            {/* 7. 출석확인 - 보라 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("Attendance")}
            >
              <View
                style={[styles.menuIconBg, { backgroundColor: "#917FB315" }]}
              >
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={28}
                  color="#917FB3"
                />
              </View>
              <Text style={[styles.menuLabel, { color: "#917FB3" }]}>
                출석확인
              </Text>
            </TouchableOpacity>

            {/* 8. 추천하기 - 핑크 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("Referral")}
            >
              <View
                style={[styles.menuIconBg, { backgroundColor: "#FF2D5515" }]}
              >
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={28}
                  color="#FF2D55"
                />
              </View>
              <Text style={[styles.menuLabel, { color: "#FF2D55" }]}>
                추천하기
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. 광고 배너 섹션 */}
          <TouchableOpacity style={styles.adBanner}>
            <View style={styles.adTextContainer}>
              <Text style={styles.adTag}>EVENT</Text>
              <Text style={styles.adTitle}>
                우리 아이 첫 축구 교실{"\n"}지금 예약하면 20% 할인
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#fff"
              opacity={0.7}
            />
          </TouchableOpacity>

          {/* 4. 공지 사항 */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>공지 사항</Text>
            <TouchableOpacity onPress={() => navigation.navigate("NoticeList")}>
              <Text style={styles.moreText}>MORE</Text>
            </TouchableOpacity>
          </View>

          {/* 공지사항 DB 연동 및 전체공지 분기 처리 */}
          <View style={styles.noticeBox}>
            {homeNotices.length > 0 ? (
              homeNotices.map((notice, index) => (
                <React.Fragment key={notice.id}>
                  <TouchableOpacity
                    style={styles.noticeRow}
                    onPress={() =>
                      navigation.navigate("NoticeDetail", { notice })
                    }
                  >
                    <Text style={styles.noticeTitle} numberOfLines={1}>
                      {notice.branch_id === null ? "[전체공지] " : ""}
                      {notice.title}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#D1D5DB"
                    />
                  </TouchableOpacity>
                  {index < homeNotices.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))
            ) : (
              <View style={styles.noticeRow}>
                <Text style={[styles.noticeTitle, { color: "#94A3B8" }]}>
                  등록된 공지사항이 없습니다.
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerCompany}>
              {bizInfo?.company_name || "(주)그라운드코퍼레이션"}
            </Text>

            <View style={styles.footerInfoRow}>
              <Text style={styles.footerText}>
                대표자 : {bizInfo?.ceo || "김강태"}
              </Text>
              <Text style={styles.footerDivider}>|</Text>
              <Text style={styles.footerText}>
                사업자 등록번호 : {bizInfo?.biz_no || "441-86-03857"}
              </Text>
            </View>

            {bizInfo?.tongshin_no && (
              <Text style={styles.footerText}>
                통신판매업 신고번호 : {bizInfo.tongshin_no}
              </Text>
            )}

            {/* 🚀 주소 앞에 '주소 :' 추가 및 DB 연동 */}
            <Text style={styles.footerText}>
              {bizInfo?.address || "경기도 시흥시 서울대학로278번길 61, 7층"}
            </Text>

            {/* 🚀 [추가] 고객센터 연락처 표시 구역 */}
            <Text style={styles.footerText}>
              고객센터 : {bizInfo?.contact || "010-0000-0000"}
            </Text>

            {/* 💡 [수정됨] 이용약관 및 개인정보 처리방침 DB 다이나믹 링크 구현 구역 */}
            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    bizInfo?.terms_url ||
                      "링크가 설정되지 않았습니다. 지점 관리자에게 문의하세요.",
                  )
                }
              >
                <Text style={styles.footerLink}>이용약관</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    bizInfo?.privacy_url ||
                      "링크가 설정되지 않았습니다. 지점 관리자에게 문의하세요.",
                  )
                }
              >
                {/* 💡 기존 코드의 괄호 에러 수정: 스타일 배열 구조 변경 */}
                <Text style={[styles.footerLink, { marginLeft: 16 }]}>
                  개인정보 처리방침
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.copyRight}>
              © 2026 IPASSCARE. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 🚀 PopupManager */}
      <PopupManager />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1 },
  appBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoBrandText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
  },
  logoBrandAccent: { color: "#4F46E5" },
  appBarActions: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  mainPadding: { padding: 24 },
  welcomeSection: { marginBottom: 32 },
  welcomeName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  welcomeMsg: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "500",
  },
  pageViewSection: { marginBottom: 32 },
  cardWrapper: { width: width - 48, marginRight: 24 },
  cardShadow: { borderRadius: 16, backgroundColor: "#fff" },
  cardInner: { height: 150, justifyContent: "flex-end" },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
  },
  cardContent: {
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  tagText: { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 1 },
  cardDateText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  cardChildText: {
    fontSize: 15,
    color: "#fff",
    marginTop: 2,
    fontWeight: "600",
    opacity: 0.9,
  },
  branchText: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  quickMenuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  menuItem: { alignItems: "center", width: "25%", marginBottom: 24 },
  menuIconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    letterSpacing: -0.2,
  },
  adBanner: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 48,
  },
  adTextContainer: { flex: 1 },
  adTag: {
    color: "#4F46E5",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 1,
  },
  adTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  emptyCard: {
    backgroundColor: "#F9FAFB",
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },
  dotRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 3,
  },
  activeDot: { width: 16, backgroundColor: "#111827" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  moreText: {
    color: "#D1D5DB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  noticeBox: {
    marginHorizontal: 24, // 🚀 좌우 여백 추가하여 카드 형태 유지
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 4,
  },
  noticeRow: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noticeTitle: {
    fontSize: 15,
    flex: 1,
    color: "#374151",
    fontWeight: "600",
    marginRight: 12,
  },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 20 },
  footer: {
    marginTop: 40,
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerCompany: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  footerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  footerDivider: { fontSize: 11, color: "#E5E7EB", marginHorizontal: 8 },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    lineHeight: 18,
  },
  footerLinks: { flexDirection: "row", marginTop: 20 },
  footerLink: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  copyRight: {
    fontSize: 11,
    color: "#D1D5DB",
    marginTop: 24,
    fontWeight: "500",
  },
});
