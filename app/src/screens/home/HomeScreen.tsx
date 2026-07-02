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
dayjs.tz.setDefault("Asia/Seoul");
dayjs.locale("ko");

// 🚀 지점 정보를 가져오기 위해 useAuth 임포트
import { useAuth } from "../../context/AuthContext";

// 🚀 화면이 유저 눈에 보일 때마다 자동 새로고침을 수행하기 위해 useIsFocused 임포트
import { useIsFocused } from "@react-navigation/native";

// 🚀 공통 이벤트 배너 컴포넌트 임포트 (중복 제거의 핵심)
import EventBanner from "../../components/EventBanner";

// 🚀 [팝업 관리자 임포트] 유니폼 및 공지사항 통제
import PopupManager from "../../components/popups/PopupManager";
// 🚀 [알림 종 임포트] 실시간 알림 및 모달 기능 추가
import NotificationBell from "../../components/notification/NotificationBell";
import HomeStatusScene, {
  HomeStatusSceneType,
} from "../../components/status/HomeStatusScene";

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
  const [expiryAlert, setExpiryAlert] = useState<{
    days: number;
    packageName: string;
  } | null>(null);

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

        // 5. 이용권 만료 체크 (3일, 1일 남은 경우)
        // 실제 테이블명(user_packages)은 데이터베이스 구조에 맞춰 확인 필요
        const { data: userPackages } = await supabase
          .from("user_packages")
          .select("package_name, expiry_date")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("expiry_date", { ascending: true });

        if (userPackages && userPackages.length > 0) {
          const today = dayjs().tz().startOf("day");
          for (const pkg of userPackages) {
            const expiry = dayjs(pkg.expiry_date).tz().startOf("day");
            const diffDays = expiry.diff(today, "day");

            if (diffDays === 1 || diffDays === 3) {
              setExpiryAlert({
                days: diffDays,
                packageName: pkg.package_name,
              });
              break; // 가장 먼저 만료되는 것 하나만 표시
            }
          }
        }
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

    // 기본 상태
    let statusLabel = "오늘의 일정을 기다리고 있어요";
    let statusBg = "rgba(255,255,255,0.2)";
    let sceneType: HomeStatusSceneType = "waiting";
    let bgImage =
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800"; // 기본 축구장 배경

    if (hasReservation) {
      const attStatus = specificReservation.attendance_status;
      const isShuttleUser = specificReservation.is_shuttle_user ?? true;

      if (isShuttleUser) {
        if (attStatus === "하차") {
          statusLabel = "안전하게 셔틀에서 하차했어요 🏠";
          statusBg = "#64748B";
          sceneType = "dropoff";
          bgImage =
            "https://images.unsplash.com/photo-1490139177067-2819828d54d1?q=80&w=800";
        } else if (attStatus === "하원") {
          statusLabel = "집으로 가는 셔틀을 타고 있어요 🚌";
          statusBg = "#3D56B2";
          sceneType = "goingHome";
          bgImage =
            "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800";
        } else if (attStatus === "이동중") {
          statusLabel = "셔틀이 안전하게 이동 중이에요 🚌";
          statusBg = "#2563EB";
          sceneType = "moving";
          bgImage =
            "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800";
        } else if (attStatus === "등원") {
          statusLabel = "학원에 도착해 열심히 수업 중이에요 ⚽";
          statusBg = "#10B981";
          sceneType = "class";
          bgImage =
            "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800";
        } else if (attStatus === "승차") {
          statusLabel = "학원 가는 셔틀에 탑승했어요 🚌";
          statusBg = "#3D56B2";
          sceneType = "boarding";
          bgImage =
            "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800";
        }
      } else {
        if (attStatus === "하원") {
          statusLabel = "수업을 안전하게 마쳤어요 👋";
          statusBg = "#F59E0B";
          sceneType = "dropoff";
          bgImage =
            "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=800";
        } else if (attStatus === "등원") {
          statusLabel = "학원에 도착해 열심히 수업 중이에요 ⚽";
          statusBg = "#10B981";
          sceneType = "class";
          bgImage =
            "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800";
        }
      }
    }

    return (
      <View style={styles.cardShadow}>
        {hasReservation ? (
          <View style={[styles.cardInner, styles.animatedStatusCard]}>
            <HomeStatusScene type={sceneType} />
            <View style={styles.cardContent}>
              <View>
                <View style={[styles.tag, { backgroundColor: statusBg }]}>
                  <Text style={styles.tagText}>{statusLabel}</Text>
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
          </View>
        ) : (
          <View
            style={[styles.cardInner, styles.emptyCard, styles.emptyStatusCard]}
          >
            <HomeStatusScene type="waiting" />
            <View style={styles.emptyCardContent}>
              <Text style={styles.emptyText}>예정된 수업이 없습니다.</Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate("Reservation")}
              >
                <Text style={styles.emptyActionText}>예약하러 가기</Text>
              </TouchableOpacity>
            </View>
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
            {expiryAlert && (
              <TouchableOpacity
                style={styles.expiryBanner}
                onPress={() => navigation.navigate("MyPackage")}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color="#EF4444"
                />
                <Text style={styles.expiryBannerText}>
                  {expiryAlert.packageName} 만료가{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {expiryAlert.days}일
                  </Text>{" "}
                  남았습니다.
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#EF4444" />
              </TouchableOpacity>
            )}
            <Text style={styles.welcomeMsg}>오늘의 일정을 확인하세요.</Text>
          </View>

          {/* 1. Schedule Cards */}
          <View style={styles.pageViewSection}>
            <FlatList
              data={children.length > 0 ? children : [userData]}
              horizontal
              pagingEnabled={true}
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

          {/* 📅 [추가] 매일 한글 모으기 출석체크 이벤트 배너 */}
          <TouchableOpacity
            style={styles.checkInEventBanner}
            onPress={() => navigation.navigate("CheckIn")}
            activeOpacity={0.9}
          >
            <View style={styles.checkInEventLeft}>
              <View style={styles.eventLabelBadge}>
                <Text style={styles.eventLabelBadgeText}>EVENT</Text>
              </View>
              <Text style={styles.checkInEventTitle}>매일 출석체크 하고 포인트 받기</Text>
              <Text style={styles.checkInEventSub}>'아이패스케어' 한글을 한 자씩 모아보세요!</Text>
            </View>
            <View style={styles.checkInEventRight}>
              <MaterialCommunityIcons name="calendar-check" size={32} color="#6366F1" />
            </View>
          </TouchableOpacity>

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

          {/* 3. 🎉 [수정] 중복 제거된 공통 광고 배너 섹션 교체 */}
          <EventBanner
            screenType="home"
            branchId={branchId}
            marginHorizontal={0} // HomeScreen UI 구조에 맞춰 패딩 무력화 상쇄
          />

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

            {!!bizInfo?.tongshin_no && (
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

      {/* 🚀 수정됨: 팝업 매니저에게 branchId와 children 데이터를 넘겨줍니다! */}
      <PopupManager branchId={branchId} childrenData={children} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  checkInEventBanner: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  checkInEventLeft: {
    flex: 1,
  },
  eventLabelBadge: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  eventLabelBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  checkInEventTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  checkInEventSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  checkInEventRight: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
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
  expiryBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  expiryBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    marginLeft: 8,
    fontWeight: "600",
  },
  pageViewSection: {
    marginBottom: 32,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  cardShadow: {
    borderRadius: 0,
    backgroundColor: "#fff",
    marginHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInner: {
    height: 160,
    justifyContent: "flex-end",
  },
  animatedStatusCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#EAF4FF",
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
    zIndex: 2,
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
    color: "#111827",
    letterSpacing: -0.5,
  },
  cardChildText: {
    fontSize: 15,
    color: "#334155",
    marginTop: 2,
    fontWeight: "600",
  },
  branchText: { fontSize: 12, color: "#64748B", marginTop: 4 },
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
  emptyCard: {
    backgroundColor: "#F9FAFB",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  emptyStatusCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F5F3FF",
  },
  emptyCardContent: {
    zIndex: 2,
    alignItems: "flex-start",
    alignSelf: "stretch",
    paddingLeft: 24,
  },
  emptyActionBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#4F46E5",
    borderRadius: 8,
  },
  emptyActionText: { color: "white", fontSize: 12, fontWeight: "700" },
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
    marginTop: 24, // 배너 하단과의 여백 추가
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
