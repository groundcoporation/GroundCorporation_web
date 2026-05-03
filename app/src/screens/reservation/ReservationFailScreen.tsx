import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
// 1. 경고 제거 및 일관성을 위해 react-native-safe-area-context 사용
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ReservationFailScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      {/* 1. 실패 메시지 영역 */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="warning" size={80} color="#EF4444" />
        </View>

        <Text style={styles.title}>결제에 실패했습니다</Text>
        <Text style={styles.subtitle}>
          시스템 오류 또는 결제 정보 오류일 수 있습니다.{"\n"}
          다시 시도하거나 지점으로 문의해 주세요.
        </Text>

        <View style={styles.errorDetailBox}>
          <Text style={styles.errorDetailText}>
            네트워크 연결 상태나 카드 한도를 확인해주세요.
          </Text>
        </View>
      </View>

      {/* 2. 하단 버튼 영역 */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.retryButton}
          // navigation.goBack()은 스택 상황에 따라 결제창으로 다시 돌아갈 수 있는지 확인이 필요합니다.
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>다시 시도하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          // navigation.replace는 현재 화면을 히스토리에서 제거하고 이동하므로 적절한 선택입니다.
          onPress={() => navigation.replace("Home")}
        >
          <Text style={styles.homeButtonText}>확인 후 홈으로 이동</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
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
    backgroundColor: "#FEF2F2",
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
  errorDetailBox: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 12,
    width: "100%",
  },
  errorDetailText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },
  buttonGroup: {
    padding: 20,
    gap: 12,
    // iOS의 하단 홈 바(Indicator) 공간을 확보하기 위해 SafeAreaView와 조합하여 사용합니다.
    marginBottom: Platform.OS === "ios" ? 8 : 10,
  },
  retryButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  homeButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  homeButtonText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "700",
  },
});
