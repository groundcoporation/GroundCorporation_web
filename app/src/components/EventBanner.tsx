import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  ImageBackground,
  Animated,
} from "react-native";
import RenderHtml, { MixedStyleDeclaration } from "react-native-render-html";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

interface EventBannerProps {
  screenType: "home" | "purchase" | "referral";
  branchId: string | null;
  marginHorizontal?: number;
}

const tagsStyles: Record<string, MixedStyleDeclaration> = {
  body: { margin: 0, padding: 0 },
  p: { margin: 0, padding: 0 },
  div: { margin: 0, padding: 0 },
  span: { margin: 0, padding: 0 },
};

export default function EventBanner({
  screenType,
  branchId,
  marginHorizontal = 24,
}: EventBannerProps) {
  const [banners, setBanners] = useState<any[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const cardWidth = useMemo(
    () => width - marginHorizontal * 2,
    [marginHorizontal],
  );
  const banner = banners[activeBannerIndex];

  // 인라인 스타일 하이픈 계열 파싱 전처리 치환
  const htmlSource = useMemo(() => {
    if (!banner?.content_html) return null;
    let processedHtml = banner.content_html;
    processedHtml = processedHtml.replace(/font-size/g, "fontSize");
    processedHtml = processedHtml.replace(/font-weight/g, "fontWeight");
    processedHtml = processedHtml.replace(/margin-top/g, "marginTop");
    processedHtml = processedHtml.replace(/line-height/g, "lineHeight");
    return { html: `<div>${processedHtml}</div>` };
  }, [banner?.content_html]);

  useEffect(() => {
    if (branchId) {
      fetchBanners();
    }
  }, [branchId, screenType]);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setActiveBannerIndex((prev) => (prev + 1) % banners.length);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length, fadeAnim]);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from("banners")
      .select("*")
      .eq("screen_type", screenType)
      .eq("is_active", true)
      .or(`branch_id.eq.${branchId},branch_id.is.null`)
      .order("display_order", { ascending: true });

    if (data) {
      setBanners(data);
      setActiveBannerIndex(0);
      fadeAnim.setValue(1);
    }
  };

  if (banners.length === 0) return null;

  return (
    <View style={[styles.wrapper, { marginHorizontal }]}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.adBanner,
            { backgroundColor: banner.bg_color || "#111827" },
          ]}
          onPress={() => banner.link_url && Linking.openURL(banner.link_url)}
        >
          <ImageBackground
            source={banner.image_url ? { uri: banner.image_url } : undefined}
            style={styles.adBannerBackground}
            imageStyle={{ borderRadius: 16 }}
          >
            {banner.image_url && <View style={styles.imageDimOverlay} />}

            <View style={styles.adTextContainer}>
              {/* 🚀 1. 상단 태그 배지 영역: 새로 추가한 정식 tag_text 컬럼 데이터 매칭 */}
              {screenType === "referral" ? (
                <View style={styles.headerRow}>
                  <Ionicons name="gift" size={16} color="#FF6B6B" />
                </View>
              ) : (
                // 기획전 화면이 아니고 관리자가 태그 텍스트를 기입했을 때 동적 표출
                !!banner.tag_text && (
                  <View style={styles.headerRow}>
                    <Text
                      style={[
                        styles.adTag,
                        { color: banner.title_color || "#6366F1" },
                      ]}
                    >
                      {banner.tag_text.toUpperCase()}
                    </Text>
                  </View>
                )
              )}

              {htmlSource ? (
                <RenderHtml
                  contentWidth={cardWidth - 80}
                  source={htmlSource}
                  tagsStyles={tagsStyles}
                  computeEmbeddedMaxWidth={(availableWidth) => availableWidth}
                />
              ) : (
                // 🚀 2. 텍스트 분리 계층 구조: 대제목과 소제목의 폰트 상속 버그 해결
                <View style={styles.textContentLayout}>
                  <Text
                    style={[
                      styles.adTitle,
                      { color: banner.title_color || "#FFFFFF" },
                    ]}
                    numberOfLines={1}
                  >
                    {banner.title}
                  </Text>

                  {/* 소제목(부제목) 가이드라인 분리 매칭 및 폰트 크기 축소 축약 처리 */}
                  {!!banner.subtitle && (
                    <Text
                      style={[
                        styles.adSubtitle,
                        {
                          color:
                            banner.subtitle_color ||
                            banner.title_color ||
                            "#FFFFFF",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {banner.subtitle}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={banner.title_color || "#FFFFFF"}
              opacity={0.7}
              style={{ marginLeft: 8 }}
            />
          </ImageBackground>
        </TouchableOpacity>
      </Animated.View>

      {banners.length > 1 && (
        <View style={styles.dotRow}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, activeBannerIndex === i && styles.activeDot]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  adBanner: { height: 110, borderRadius: 16, overflow: "hidden" },
  adBannerBackground: {
    width: "100%",
    height: "100%",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  adTextContainer: { flex: 1, justifyContent: "center", zIndex: 2 },
  headerRow: { marginBottom: 4 },
  adTag: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  // 🚀 타이포그래피 짜치지 않는 이중 수직 레이아웃 전용 스타일 패키지
  textContentLayout: { flexDirection: "column", justifyContent: "center" },
  adTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  adSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    opacity: 0.85, // 대제목보다 가독성 균형을 맞추기 위한 최적화 농도
  },

  dotRow: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  activeDot: { width: 18, backgroundColor: "#111827" },
});
