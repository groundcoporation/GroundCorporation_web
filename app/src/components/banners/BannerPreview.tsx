import React, { useMemo } from "react";
import {
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RenderHtml, { MixedStyleDeclaration } from "react-native-render-html";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const tagsStyles: Record<string, MixedStyleDeclaration> = {
  body: { margin: 0, padding: 0 },
  p: { margin: 0, padding: 0 },
  div: { margin: 0, padding: 0 },
  span: { margin: 0, padding: 0 },
};

interface BannerPreviewProps {
  banner: any;
  screenType?: "home" | "purchase" | "referral";
  marginHorizontal?: number;
  onPress?: () => void;
  disabled?: boolean;
}

export default function BannerPreview({
  banner,
  screenType,
  marginHorizontal = 0,
  onPress,
  disabled = false,
}: BannerPreviewProps) {
  const cardWidth = width - marginHorizontal * 2;
  const resolvedScreenType = screenType || banner?.screen_type || "home";

  const htmlSource = useMemo(() => {
    if (!banner?.content_html) return null;

    const processedHtml = banner.content_html
      .replace(/font-size/g, "fontSize")
      .replace(/font-weight/g, "fontWeight")
      .replace(/margin-top/g, "marginTop")
      .replace(/line-height/g, "lineHeight");

    return { html: `<div>${processedHtml}</div>` };
  }, [banner?.content_html]);

  const handlePress = () => {
    if (disabled) return;
    if (onPress) {
      onPress();
      return;
    }
    if (banner?.link_url) Linking.openURL(banner.link_url);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.adBanner,
        { backgroundColor: banner?.bg_color || "#111827" },
      ]}
      disabled={disabled && !onPress}
      onPress={handlePress}
    >
      {!!banner?.image_url && (
        <View style={styles.adBannerImageLayer} pointerEvents="none">
          <Image
            source={{ uri: banner.image_url }}
            style={styles.adBannerImage}
            resizeMode="cover"
          />
        </View>
      )}

      {!!banner?.image_url && <View style={styles.imageDimOverlay} />}

      <View style={styles.adBannerContent}>
        <View style={styles.adTextContainer}>
          {resolvedScreenType === "referral" ? (
            <View style={styles.headerRow}>
              <Ionicons name="gift" size={16} color="#FF6B6B" />
            </View>
          ) : (
            !!banner?.tag_text && (
              <View style={styles.headerRow}>
                <Text
                  style={[
                    styles.adTag,
                    { color: banner?.title_color || "#FFFFFF" },
                  ]}
                  numberOfLines={1}
                >
                  {String(banner.tag_text).toUpperCase()}
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
            <View style={styles.textContentLayout}>
              <Text
                style={[
                  styles.adTitle,
                  { color: banner?.title_color || "#FFFFFF" },
                ]}
                numberOfLines={1}
              >
                {banner?.title || "Banner title"}
              </Text>

              {!!banner?.subtitle && (
                <Text
                  style={[
                    styles.adSubtitle,
                    {
                      color:
                        banner?.subtitle_color ||
                        banner?.title_color ||
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
          color={banner?.title_color || "#FFFFFF"}
          opacity={0.7}
          style={styles.chevronIcon}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  adBanner: {
    position: "relative",
    width: "100%",
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
  },
  adBannerImageLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: "hidden",
  },
  adBannerImage: {
    width: "100%",
    height: "100%",
  },
  imageDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    zIndex: 1,
  },
  adBannerContent: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    height: "100%",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adTextContainer: { flex: 1, justifyContent: "center" },
  headerRow: { marginBottom: 4 },
  adTag: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  textContentLayout: { flexDirection: "column", justifyContent: "center" },
  adTitle: { fontSize: 16, fontWeight: "800", lineHeight: 22 },
  adSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    opacity: 0.86,
  },
  chevronIcon: { marginLeft: 8 },
});
