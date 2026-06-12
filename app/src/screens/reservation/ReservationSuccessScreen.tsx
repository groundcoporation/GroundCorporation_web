import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
// 경고 해결을 위해 react-native-safe-area-context 사용
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ReservationSuccessScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.replace("Home")}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={26} color="#64748B" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          {/* 예약 완료를 상징하는 캘린더 체크 아이콘으로 변경 */}
          <Ionicons name="calendar-outline" size={80} color="#6366F1" />
        </View>

        <Text style={styles.title}>수업 예약 완료! 📅</Text>

        <Text style={styles.subtitle}>
          선택하신 수업의 예약이 확정되었습니다.{"\n"}
          아이와 함께 늦지 않게 방문해 주세요!
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            상세 예약 내역 및 스케줄 확인은{"\n"}
            마이페이지 {">"} 내 활동 메뉴에서 가능합니다.
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.buttonGroup,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          // 메인으로 돌아가서 다른 활동을 하도록 유도
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.primaryButtonText}>홈으로 돌아가기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          // 추가 예약을 원하는 부모님을 위해 다시 예약 화면으로 이동
          onPress={() => navigation.navigate("Reservation")}
        >
          <Text style={styles.secondaryButtonText}>추가 수업 예약하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 18,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 15,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  infoBox: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 12,
    width: "100%",
  },
  infoText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  buttonGroup: {
    padding: 20,
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 20 : 10,
  },
  primaryButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  secondaryButton: {
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
  },
  secondaryButtonText: { color: "#475569", fontSize: 15, fontWeight: "700" },
});
