import React, { useEffect } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type HomeStatusSceneType =
  | "waiting"
  | "boarding"
  | "moving"
  | "arrived"
  | "class"
  | "home";

export default function HomeStatusScene({
  type,
}: {
  type: HomeStatusSceneType;
}) {
  const bob = React.useRef(new Animated.Value(0)).current;
  const drive = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const driveLoop = Animated.loop(
      Animated.timing(drive, {
        toValue: 1,
        duration: 1700,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    bobLoop.start();
    driveLoop.start();
    pulseLoop.start();

    return () => {
      bobLoop.stop();
      driveLoop.stop();
      pulseLoop.stop();
    };
  }, [bob, drive, pulse]);

  const bobY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const busX = drive.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-8, 18, -8],
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  const isBusScene =
    type === "boarding" || type === "moving" || type === "home";
  const iconName =
    type === "class"
      ? "soccer"
      : type === "arrived"
        ? "school-outline"
        : type === "home"
          ? "home-heart"
          : isBusScene
            ? "bus-school"
            : "calendar-heart";

  const accentColor =
    type === "class"
      ? "#F59E0B"
      : type === "arrived"
        ? "#10B981"
        : type === "home"
          ? "#EC4899"
          : type === "moving"
            ? "#3B82F6"
            : "#6366F1";

  return (
    <View style={styles.sceneWrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.sceneGlow,
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
            backgroundColor: accentColor,
          },
        ]}
      />
      <View style={styles.sceneCloudOne} />
      <View style={styles.sceneCloudTwo} />
      <Animated.View
        style={[
          styles.sceneIconBubble,
          {
            transform: [
              { translateY: bobY },
              { translateX: isBusScene ? busX : 0 },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={iconName as any}
          size={44}
          color={accentColor}
        />
      </Animated.View>
      <View style={styles.sceneRoad}>
        <Animated.View
          style={[
            styles.sceneRoadDot,
            {
              transform: [
                {
                  translateX: drive.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-18, 54],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sceneWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 28,
  },
  sceneGlow: {
    position: "absolute",
    right: -30,
    top: -42,
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  sceneCloudOne: {
    position: "absolute",
    top: 22,
    right: 118,
    width: 46,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  sceneCloudTwo: {
    position: "absolute",
    top: 52,
    right: 28,
    width: 30,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  sceneIconBubble: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  sceneRoad: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 108,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.64)",
    overflow: "hidden",
  },
  sceneRoadDot: {
    width: 22,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(99,102,241,0.55)",
  },
});
