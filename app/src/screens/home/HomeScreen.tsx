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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("*, branches(name)")
          .eq("id", user.id)
          .single();
        setUserData(userProfile);

        const { data: childrenList } = await supabase
          .from("children")
          .select("*")
          .eq("parent_id", user.id)
          .order("created_at", { ascending: true });
        setChildren(childrenList || []);
      }
    } catch (e) {
      console.log("데이터 로드 에러:", e);
    } finally {
      setLoading(false);
    }
  };

  // 💡 수정됨: 카드를 더 슬림하게 만들고 위치 정보를 제거했습니다.
  const renderLessonCard = (targetName: string, isChild: boolean) => (
    <View style={styles.cardShadow}>
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
            <Text style={styles.cardDateText}>05.01 WED 14:00</Text>
            <Text style={styles.cardChildText}>
              {targetName} {isChild ? "학생" : "회원님"}
            </Text>
            {/* 위치 정보 제거, 지점 이름만 심플하게 노출 */}
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
    </View>
  );

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
                    renderLessonCard(item.name, children.length > 0)
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

          {/* 2. 💡 수정됨: Quick Menu 4열 2행 구조 (총 6개 메뉴) */}
          <View style={styles.quickMenuGrid}>
            {[
              { icon: "calendar-plus", label: "수업 예약", color: "#4F46E5", screen: "Reservation" },
              { icon: "ticket-confirmation-outline", label: "이용권 구매", color: "#111827", screen: "Pass" },
              { icon: "shopping-outline", label: "쇼핑몰", color: "#111827", screen: "Shop" },
              { icon: "image-outline", label: "갤러리", color: "#111827", screen: "Gallery" },
              { icon: "bus-school", label: "등하원", color: "#111827", screen: "Pickup" },
              { icon: "check-decagram", label: "출석체크", color: "#111827", screen: "Attendance" },
            ].map((menu, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.menuItem}
                onPress={() => navigation.navigate(menu.screen)}
              >
                <View style={styles.menuIconBg}>
                  <MaterialCommunityIcons
                    name={menu.icon as any}
                    size={28}
                    color={menu.color}
                  />
                </View>
                <Text
                  style={[
                    styles.menuLabel,
                    { color: menu.color === "#4F46E5" ? "#4F46E5" : "#4B5563" },
                  ]}
                >
                  {menu.label}
                </Text>
              </TouchableOpacity>
            ))}
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
            <TouchableOpacity onPress={() => navigation.navigate("Notice")}>
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
  
  // 💡 수정됨: 기존 210에서 150으로 줄여서 카드를 슬림하게 변경
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
    marginBottom: 8, // 간격 살짝 축소
  },
  tagText: { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 1 },
  cardDateText: {
    fontSize: 22, // 슬림해진 카드에 맞춰 폰트 크기 미세조정
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
  
  // 💡 수정됨: 4열 2행 구조를 위해 flexWrap 적용 및 width 조절
  quickMenuGrid: {
    flexDirection: "row",
    flexWrap: "wrap", // 줄바꿈을 허용하여 2줄로 만듦
    justifyContent: "flex-start",
    marginBottom: 12, // 배너와의 간격 조절
  },
  menuItem: { 
    alignItems: "center", 
    width: "25%", // 화면을 4등분
    marginBottom: 24 // 위아래 2줄 간격
  },
  menuIconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#F9FAFB", // 살짝 배경을 주어 클릭 영역 명확히
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
    height: 150, // 슬림 카드에 맞춤
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