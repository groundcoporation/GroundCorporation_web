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

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  
  // 💡 새로 추가된 상태: 가장 가까운 예약 데이터
  const [upcomingReservation, setUpcomingReservation] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
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

        // 2. 자녀 정보 로드
        const { data: childrenList } = await supabase
          .from("children")
          .select("*")
          .eq("parent_id", user.id)
          .order("created_at", { ascending: true });
        setChildren(childrenList || []);

        // 💡 3. 새로 추가: 다가오는 예약 로드 (오늘 이후의 가장 빠른 예약 1건)
        const today = new Date().toISOString();
        const { data: reservation } = await supabase
          .from("reservations")
          .select("*")
          .eq("user_id", user.id) // 본인 또는 자녀의 예약
          .gte("reservation_date", today) // 오늘 시간 이후
          .order("reservation_date", { ascending: true }) // 가장 빠른 날짜순
          .limit(1)
          .single();
          
        if (reservation) {
          setUpcomingReservation(reservation);
        }
      }
    } catch (e) {
      console.log("데이터 로드 에러:", e);
    } finally {
      setLoading(false);
    }
  };

  // 💡 새로 추가: 예약 날짜 포맷 함수 (예: 05.01 WED 14:00)
  const formatReservationDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const dayOfWeek = days[date.getDay()];
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month}.${day} ${dayOfWeek} ${hours}:${minutes}`;
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
                {/* 💡 DB에서 가져온 실제 예약 날짜 연동 */}
                <Text style={styles.cardDateText}>
                  {formatReservationDate(upcomingReservation.reservation_date)}
                </Text>
                <Text style={styles.cardChildText}>
                  {targetName} {isChild ? "학생" : "회원님"}
                </Text>
                <Text style={styles.branchText}>
                  {userData?.branches?.name || "시흥본점"}
                </Text>
              </View>
              {isChild && (
                <TouchableOpacity style={styles.pickupBtnActive}>
                  <Text style={styles.pickupBtnTextActive}>픽업 신청</Text>
                </TouchableOpacity>
              )}
            </View>
          </ImageBackground>
        ) : (
          // 💡 예약이 없을 때 보여주는 빈 화면 및 예약 버튼 유도
          <View style={[styles.cardInner, styles.emptyCard]}>
            <MaterialCommunityIcons name="calendar-blank" size={32} color="#D1D5DB" />
            <Text style={[styles.emptyText, { marginTop: 8 }]}>
              예정된 수업이 없습니다.
            </Text>
            <TouchableOpacity 
              style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#4F46E5', borderRadius: 8 }}
              onPress={() => navigation.navigate("Reservation")}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>예약하러 가기</Text>
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
          <TouchableOpacity style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={22} color="#111827" />
            <View style={styles.badge} />
          </TouchableOpacity>
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
                    renderLessonCard(item.name || item.child_name, children.length > 0)
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

          {/* 2. Quick Menu - 4열 2행 구조 (개별 경로 명시형으로 수정) */}
          <View style={styles.quickMenuGrid}>
            
            {/* 행 1 */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Reservation")}>
              <View style={styles.menuIconBg}>
                <MaterialCommunityIcons name="calendar-plus" size={28} color="#4F46E5" />
              </View>
              <Text style={[styles.menuLabel, { color: "#4F46E5" }]}>수업 예약</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Pass")}>
              <View style={styles.menuIconBg}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={28} color="#111827" />
              </View>
              <Text style={styles.menuLabel}>이용권 구매</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("MyPackage")}>
              <View style={styles.menuIconBg}>
                <MaterialCommunityIcons name="ticket-account" size={28} color="#111827" />
              </View>
              <Text style={styles.menuLabel}>이용권 확인</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL("http://vog-sports.com/")}>
              <View style={styles.menuIconBg}>
                <MaterialCommunityIcons name="shopping-outline" size={28} color="#111827" />
              </View>
              <Text style={styles.menuLabel}>쇼핑몰</Text>
            </TouchableOpacity>

            {/* 행 2 */}
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("GalleryList")}>
              <View style={styles.menuIconBg}>
                <MaterialCommunityIcons name="image-outline" size={28} color="#111827" />
              </View>
              <Text style={styles.menuLabel}>갤러리</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("PickupMain")}>
              <View style={styles.menuIconBg}>
                <MaterialCommunityIcons name="bus-school" size={28} color="#111827" />
              </View>
              <Text style={styles.menuLabel}>픽업</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("Attendance")}>
              <View style={styles.menuIconBg}>
                <MaterialCommunityIcons name="check-decagram" size={28} color="#111827" />
              </View>
              <Text style={styles.menuLabel}>출석확인</Text>
            </TouchableOpacity>

            {/* 마지막 칸 비워둠 (4열 맞춤용) */}
            <View style={styles.menuItem} />
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
            <TouchableOpacity style={styles.noticeRow}>
              <Text style={styles.noticeTitle} numberOfLines={1}>
                IPASSCARE 시스템 점검 안내
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.noticeRow}>
              <Text style={styles.noticeTitle} numberOfLines={1}>
                신규 지점 오픈 및 이용권 혜택 안내
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerCompany}>(주)그라운드코퍼레이션</Text>
            <View style={styles.footerInfoRow}>
              <Text style={styles.footerText}>대표 김강태</Text>
              <Text style={styles.footerDivider}>|</Text>
              <Text style={styles.footerText}>사업자 441-86-03857</Text>
            </View>
            <Text style={styles.footerText}>
              경기도 시흥시 서울대학로278번길 61, 7층
            </Text>

            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://docs.google.com")}
              >
                <Text style={styles.footerLink}>이용약관</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://docs.google.com")}
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
  iconCircle: { position: "relative" },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#4F46E5",
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
  pickupBtnActive: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickupBtnTextActive: { color: "#111827", fontWeight: "700", fontSize: 13 },
  quickMenuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  menuItem: { 
    alignItems: "center", 
    width: "25%",
    marginBottom: 24
  },
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