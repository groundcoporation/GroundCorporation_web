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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// 🚀 dayjs 플러그인 설정
dayjs.extend(utc);
dayjs.extend(timezone);

// 🚀 지점 정보를 가져오기 위해 useAuth 임포트
import { useAuth } from "../../context/AuthContext";

// 🚀 화면이 유저 눈에 보일 때마다 자동 새로고침을 수행하기 위해 useIsFocused 임포트
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
  contact: string;
  tongshin_no: string;
  company_name: string;
  terms_url?: string;
  privacy_url?: string;
  escrow_no?: string;
}

const { width } = Dimensions.get("window");
// 🚀 메인 패딩 좌우 값(24 * 2 = 48)을 제외한 정확한 카드의 가로 폭
const CARD_WIDTH = width - 48;

export default function HomeScreen({ navigation }: any) {
  const { branchId } = useAuth();
  const isFocused = useIsFocused();

  const [userData, setUserData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [upcomingReservation, setUpcomingReservation] = useState<any[]>([]);
  const [bizInfo, setBizInfo] = useState<BizInfo | null>(null);
  const [homeNotices, setHomeNotices] = useState<any[]>([]);

  useEffect(() => {
    if (branchId && isFocused) {
      console.log(
        `🏠 [포커스 감지] 홈 화면(${branchId}) 진입. 최신 데이터를 새로고침합니다.`,
      );
      fetchData();
    } else if (!branchId && isFocused) {
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
        // 1. 유저 정보 로드
        const { data: userProfile } = await supabase
          .from("users")
          .select("*, branches(name)")
          .eq("id", user.id)
          .single();
        setUserData(userProfile);

        // 1-2. 지점의 biz_info 로드
        const targetBranchId = branchId || userProfile?.branch_id || "main";
        let { data: branchData } = await supabase
          .from("branches")
          .select("biz_info")
          .eq("id", targetBranchId)
          .single();

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

        // 3. 다가오는 예약 로드
        const today = dayjs().tz().format("YYYY-MM-DD");
        const { data: reservations } = await supabase
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
          .order("class_schedules(start_time)", { ascending: true });

        setUpcomingReservation(reservations || []);

        // 4. 홈 화면 공지사항 로드
        const { data: notices } = await supabase
          .from("notices")
          .select("*")
          .eq("is_on_home", true)
          .or(`branch_id.eq.${branchId},branch_id.is.null`)
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

  const renderLessonCard = (
    targetName: string,
    isChild: boolean,
    specificReservation: any,
  ) => {
    const hasReservation = !!specificReservation;

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
                <Text style={styles.cardDateText}>
                  {formatReservationDate(
                    specificReservation.class_date,
                    specificReservation.class_schedules?.start_time,
                  )}
                </Text>
                <Text style={styles.cardChildText}>
                  {specificReservation.class_schedules?.target_class
                    ? `${specificReservation.class_schedules.target_class} | `
                    : ""}
                  {targetName} {isChild ? "학생" : "회원님"}
                </Text>
                <Text style={styles.branchText}>
                  {specificReservation?.branches?.name ||
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
              pagingEnabled={true} // 🚀 자석처럼 한 페이지씩 딱딱 들어맞도록 스냅 활성화
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / CARD_WIDTH,
                );
                setActiveChildIndex(index);
              }}
              renderItem={({ item }) => {
                let targetReservation = null;

                if (upcomingReservation && upcomingReservation.length > 0) {
                  if (item?.id && item.id !== userData?.id) {
                    targetReservation = upcomingReservation.find(
                      (res: any) => res.child_id === item.id,
                    );
                  } else {
                    targetReservation = upcomingReservation.find(
                      (res: any) =>
                        res.child_id === null || res.child_id === userData?.id,
                    );
                  }
                }

                return (
                  // 🚀 카드 한 장이 메인 여백을 제외한 너비를 꽉 채우도록 설정하여 밀림과 짤림 방지
                  <View style={{ width: CARD_WIDTH }}>
                    {item ? (
                      renderLessonCard(
                        item.name || item.child_name,
                        children.length > 0,
                        targetReservation,
                      )
                    ) : (
                      <View style={[styles.cardInner, styles.emptyCard]}>
                        <Text style={styles.emptyText}>
                          등록된 일정이 없습니다.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              }}
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

            <Text style={styles.footerText}>
              {bizInfo?.address || "경기도 시흥시 서울대학로278번길 61, 7층"}
            </Text>

            <Text style={styles.footerText}>
              고객센터 : {bizInfo?.contact || "010-0000-0000"}
            </Text>

            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(bizInfo?.terms_url || "https://google.com")
                }
              >
                <Text style={styles.footerLink}>이용약관</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(bizInfo?.privacy_url || "https://google.com")
                }
              >
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
  pageViewSection: {
    marginBottom: 32,
    // 🚀 대폭 수정: 부모 패딩(24)을 무력화하고 좌우로 완전히 100% 밀착시키는 마법의 코드
    marginHorizontal: -24,
    paddingHorizontal: 24, // 안쪽 카드의 정렬 위치는 그대로 유지
  },
  cardShadow: {
    borderRadius: 0,
    backgroundColor: "#fff",
    // 🚀 양옆 마진을 0으로 꽉 채우거나 미세한 조정을 통해 그림자 찌꺼기 노출을 완벽 차단합니다.
    marginHorizontal: 0,
    // 그림자 농도를 살짝 부드럽게 조절
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInner: {
    height: 160, // 🚀 좀 더 시원하고 와이드하게 보이도록 세로 높이 살짝 확장
    justifyContent: "flex-end",
  },
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
    height: 160,
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
    marginHorizontal: 0,
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
