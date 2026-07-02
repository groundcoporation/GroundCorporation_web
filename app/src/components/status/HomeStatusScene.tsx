import React, { useEffect } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type HomeStatusSceneType =
  | "waiting"
  | "boarding"
  | "moving"
  | "arrived"
  | "class"
  | "goingHome"
  | "dropoff"
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
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const driveLoop = Animated.loop(
      Animated.timing(drive, {
        toValue: 1,
        duration: type === "moving" || type === "goingHome" ? 3200 : 2200,
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
  }, [bob, drive, pulse, type]);

  const bobY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const busTravelX = drive.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 210],
  });
  const shortBusX = drive.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [14, 34, 14],
  });
  const roadLineX = drive.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 110],
  });
  const cloudX = drive.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -44],
  });
  const ballY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.16, 0.34],
  });

  const isTravelScene = type === "moving" || type === "goingHome";
  const isHomeScene = type === "goingHome" || type === "dropoff" || type === "home";
  const palette =
    type === "class"
      ? styles.classPalette
      : isHomeScene
        ? styles.homePalette
        : type === "arrived"
          ? styles.arrivedPalette
          : type === "waiting"
            ? styles.waitingPalette
            : styles.busPalette;

  const renderClouds = () => (
    <>
      <Animated.View
        style={[styles.cloudLarge, { transform: [{ translateX: cloudX }] }]}
      />
      <Animated.View
        style={[styles.cloudSmall, { transform: [{ translateX: cloudX }] }]}
      />
    </>
  );

  const renderCity = () => (
    <View style={styles.cityLine}>
      <View style={[styles.building, styles.buildingTall]} />
      <View style={[styles.building, styles.buildingSmall]} />
      <View style={[styles.building, styles.buildingMid]} />
      <View style={[styles.building, styles.buildingTiny]} />
    </View>
  );

  const renderSchool = () => (
    <View style={styles.school}>
      <View style={styles.schoolRoof} />
      <View style={styles.schoolBody}>
        <MaterialCommunityIcons name="school-outline" size={32} color="#047857" />
      </View>
    </View>
  );

  const renderHome = () => (
    <View style={styles.home}>
      <View style={styles.homeRoof} />
      <View style={styles.homeBody}>
        <MaterialCommunityIcons name="heart" size={16} color="#EC4899" />
      </View>
    </View>
  );

  const renderRoad = () => (
    <View style={styles.road}>
      <Animated.View
        style={[styles.roadLine, { transform: [{ translateX: roadLineX }] }]}
      />
      <Animated.View
        style={[
          styles.roadLine,
          styles.roadLineTwo,
          { transform: [{ translateX: roadLineX }] },
        ]}
      />
    </View>
  );

  const renderBus = (travel = false) => (
    <Animated.View
      style={[
        styles.bus,
        {
          transform: [
            { translateX: travel ? busTravelX : shortBusX },
            { translateY: travel ? 0 : bobY },
          ],
        },
      ]}
    >
      <MaterialCommunityIcons name="bus-school" size={76} color="#2563EB" />
      <View style={styles.busLight} />
    </Animated.View>
  );

  const renderWaitingScene = () => (
    <>
      {renderClouds()}
      <View style={styles.sunWrap}>
        <Animated.View
          style={[
            styles.sunPulse,
            { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
          ]}
        />
        <MaterialCommunityIcons name="calendar-clock" size={44} color="#7C3AED" />
      </View>
      <View style={styles.waitingPlatform} />
      <View style={styles.waitingCardShadow} />
    </>
  );

  const renderBoardingScene = () => (
    <>
      {renderClouds()}
      {renderRoad()}
      {renderBus(false)}
      <View style={styles.busDoorGlow} />
      <View style={styles.stopSign}>
        <MaterialCommunityIcons name="bus-stop" size={28} color="#4F46E5" />
      </View>
    </>
  );

  const renderMovingScene = () => (
    <>
      {renderClouds()}
      {renderCity()}
      {renderRoad()}
      {renderBus(true)}
      <View style={styles.locationBubble}>
        <MaterialCommunityIcons name="map-marker-path" size={26} color="#2563EB" />
      </View>
    </>
  );

  const renderArrivedScene = () => (
    <>
      {renderClouds()}
      {renderSchool()}
      {renderRoad()}
      <View style={styles.checkBubble}>
        <MaterialCommunityIcons name="check" size={18} color="#FFF" />
      </View>
    </>
  );

  const renderClassScene = () => (
    <>
      <View style={styles.fieldLine} />
      <View style={styles.goalPost} />
      <Animated.View
        style={[styles.ball, { transform: [{ translateY: ballY }] }]}
      >
        <MaterialCommunityIcons name="soccer" size={30} color="#111827" />
      </Animated.View>
      <MaterialCommunityIcons
        name="whistle-outline"
        size={34}
        color="rgba(146,64,14,0.62)"
        style={styles.whistle}
      />
    </>
  );

  const renderGoingHomeScene = () => (
    <>
      {renderClouds()}
      {renderHome()}
      {renderRoad()}
      {renderBus(true)}
    </>
  );

  const renderDropoffScene = () => (
    <>
      {renderClouds()}
      {renderHome()}
      {renderRoad()}
      <View style={styles.checkBubble}>
        <MaterialCommunityIcons name="check" size={18} color="#FFF" />
      </View>
    </>
  );

  const scene =
    type === "boarding"
      ? renderBoardingScene()
      : type === "goingHome"
        ? renderGoingHomeScene()
        : isTravelScene
          ? renderMovingScene()
          : type === "arrived"
            ? renderArrivedScene()
            : type === "class"
              ? renderClassScene()
              : type === "dropoff" || type === "home"
                ? renderDropoffScene()
                : renderWaitingScene();

  return (
    <View style={[styles.sceneWrap, palette]} pointerEvents="none">
      <View style={styles.skyWash} />
      <View style={styles.hillBack} />
      <View style={styles.hillFront} />
      {scene}
      <View style={styles.softOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  sceneWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  busPalette: { backgroundColor: "#DCEEFF" },
  homePalette: { backgroundColor: "#FFE9F3" },
  arrivedPalette: { backgroundColor: "#DDF8EC" },
  classPalette: { backgroundColor: "#FFF3D8" },
  waitingPalette: { backgroundColor: "#F1EAFF" },
  skyWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  softOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  hillBack: {
    position: "absolute",
    left: -40,
    right: -40,
    bottom: 18,
    height: 76,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: "rgba(16,185,129,0.18)",
  },
  hillFront: {
    position: "absolute",
    left: -28,
    right: -22,
    bottom: -28,
    height: 86,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    backgroundColor: "rgba(34,197,94,0.22)",
  },
  cloudLarge: {
    position: "absolute",
    top: 20,
    right: 52,
    width: 70,
    height: 24,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  cloudSmall: {
    position: "absolute",
    top: 48,
    right: 138,
    width: 42,
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.54)",
  },
  road: {
    position: "absolute",
    left: -20,
    right: -20,
    bottom: 26,
    height: 34,
    backgroundColor: "rgba(30,41,59,0.28)",
  },
  roadLine: {
    position: "absolute",
    top: 15,
    left: 42,
    width: 64,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  roadLineTwo: {
    left: 170,
  },
  bus: {
    position: "absolute",
    right: 68,
    bottom: 42,
  },
  busLight: {
    position: "absolute",
    right: 3,
    top: 22,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FBBF24",
  },
  busDoorGlow: {
    position: "absolute",
    right: 88,
    bottom: 57,
    width: 16,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.44)",
  },
  cityLine: {
    position: "absolute",
    right: 18,
    bottom: 58,
    flexDirection: "row",
    alignItems: "flex-end",
    opacity: 0.48,
  },
  building: {
    width: 24,
    marginLeft: 5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: "#64748B",
  },
  buildingTall: { height: 74 },
  buildingMid: { height: 58 },
  buildingSmall: { height: 42 },
  buildingTiny: { height: 30 },
  school: {
    position: "absolute",
    right: 32,
    bottom: 57,
    alignItems: "center",
  },
  schoolRoof: {
    width: 84,
    height: 24,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    backgroundColor: "#34D399",
  },
  schoolBody: {
    width: 96,
    height: 58,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.84)",
    justifyContent: "center",
    alignItems: "center",
  },
  home: {
    position: "absolute",
    right: 34,
    bottom: 58,
    alignItems: "center",
  },
  homeRoof: {
    width: 80,
    height: 34,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#FB7185",
    transform: [{ rotate: "0deg" }],
  },
  homeBody: {
    width: 88,
    height: 54,
    borderRadius: 16,
    marginTop: -7,
    backgroundColor: "rgba(255,255,255,0.84)",
    justifyContent: "center",
    alignItems: "center",
  },
  sunWrap: {
    position: "absolute",
    right: 42,
    top: 28,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.66)",
    justifyContent: "center",
    alignItems: "center",
  },
  sunPulse: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#8B5CF6",
  },
  waitingPlatform: {
    position: "absolute",
    right: 34,
    bottom: 46,
    width: 112,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.28)",
  },
  waitingCardShadow: {
    position: "absolute",
    right: 55,
    bottom: 62,
    width: 70,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.44)",
  },
  stopSign: {
    position: "absolute",
    left: 34,
    bottom: 61,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.74)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationBubble: {
    position: "absolute",
    left: 28,
    top: 30,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.74)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkBubble: {
    position: "absolute",
    right: 22,
    top: 26,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  fieldLine: {
    position: "absolute",
    left: -20,
    right: -20,
    bottom: 34,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  goalPost: {
    position: "absolute",
    right: 18,
    bottom: 48,
    width: 72,
    height: 52,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.7)",
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  ball: {
    position: "absolute",
    right: 40,
    bottom: 58,
  },
  whistle: {
    position: "absolute",
    right: 128,
    top: 26,
  },
});
