import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";
import BannerPreview from "./banners/BannerPreview";

interface EventBannerProps {
  screenType: "home" | "purchase" | "referral";
  branchId: string | null;
  marginHorizontal?: number;
}

export default function EventBanner({
  screenType,
  branchId,
  marginHorizontal = 24,
}: EventBannerProps) {
  const [banners, setBanners] = useState<any[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const banner = banners[activeBannerIndex];

  useEffect(() => {
    if (branchId) {
      fetchBanners();
    }
  }, [branchId, screenType]);

  useEffect(() => {
    if (banners.length <= 1) return;

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
      <Animated.View style={[styles.animatedBanner, { opacity: fadeAnim }]}>
        <BannerPreview
          banner={banner}
          screenType={screenType}
          marginHorizontal={marginHorizontal}
        />
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
  wrapper: { width: "100%", marginBottom: 20 },
  animatedBanner: { width: "100%", height: 110 },
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
