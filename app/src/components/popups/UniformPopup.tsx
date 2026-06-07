import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase"; // ⚠️ 본인 프로젝트 경로에 맞게 확인해주세요

/** 🚀 자녀 데이터 타입 정의 (ID, 이름, 생일, 배정된 반 정보) */
export interface ChildData {
  id: string;
  name: string;
  birth?: string;
  targetClass?: string;
}

/** 📋 팝업 컴포넌트 Props 정의 */
interface MultiUniformPopupProps {
  isVisible: boolean;
  branchId: string | null;
  childrenData: ChildData[];
  onComplete: () => void;
  onClose: () => void;
}

export default function MultiUniformPopup({
  isVisible,
  branchId,
  childrenData,
  onComplete,
  onClose,
}: MultiUniformPopupProps) {
  // --- [상태 관리] ---
  const [sizes, setSizes] = useState<Record<string, string>>({}); // 자녀별 선택된 사이즈 {childId: size}
  const [backNumbers, setBackNumbers] = useState<Record<string, string>>({}); // 자녀별 입력된 등번호 {childId: number}
  const [errors, setErrors] = useState<Record<string, string | null>>({}); // 자녀별 중복 에러 메시지
  const [isChecking, setIsChecking] = useState<Record<string, boolean>>({}); // 자녀별 중복 체크 로딩 상태
  const [loading, setLoading] = useState(false); // 최종 저장 버튼 로딩 상태

  // 🚀 [UX] 다자녀일 경우 현재 화면에 보여줄 자녀의 인덱스 (탭 번호)
  const [currentIndex, setCurrentIndex] = useState(0);

  const sizeOptions = ["JS", "JM", "JL", "S", "M", "L", "XL"]; // 유니폼 사이즈 옵션 목록

  // --- [초기화] 팝업이 열릴 때 모든 입력값과 상태를 초기화 ---
  useEffect(() => {
    if (isVisible) {
      setSizes({});
      setBackNumbers({});
      setErrors({});
      setIsChecking({});
      setCurrentIndex(0);
    }
  }, [isVisible]);

  const currentChild = childrenData[currentIndex]; // 현재 화면에 표시 중인 자녀 정보

  /** 🚀 실시간 등번호 중복 체크 로직 */
  const checkDuplication = async (childId: string, number: string) => {
    if (!number || number.trim() === "") {
      // 입력값이 없으면 에러 초기화
      setErrors((prev) => ({ ...prev, [childId]: null }));
      setIsChecking((prev) => ({ ...prev, [childId]: false }));
      return;
    }

    try {
      // 1. [로컬 체크] 현재 팝업에 같이 띄워진 형제/자매가 같은 번호를 썼는지 확인
      const isSiblingUsing = Object.entries(backNumbers).some(
        ([id, val]) => id !== childId && val === number,
      );

      if (isSiblingUsing) {
        setErrors((prev) => ({
          ...prev,
          [childId]: "형제/자매와 같은 번호를 쓸 수 없습니다.",
        }));
        return;
      }

      const targetClass = childrenData.find(
        (c) => c.id === childId,
      )?.targetClass;
      const childIds = childrenData.map((c) => c.id);

      // 2. [DB 체크] Supabase 쿼리 생성
      let query = supabase
        .from("children")
        .select("id")
        .eq("back_number", number);

      // 지점(branch_id) 필터링
      if (branchId) query = query.eq("branch_id", branchId);
      else query = query.is("branch_id", null);

      // 반(target_class) 필터링 (반별 중복 방지 정책 적용 시)
      if (targetClass) query = query.eq("target_class", targetClass.trim());

      const { data, error } = await query;

      if (error) {
        console.error("DB 쿼리 에러:", error);
        return;
      }

      // 💡 결과 데이터 중 '나 자신' 혹은 '내 형제'가 아닌 다른 학생이 이미 쓰고 있는지 확인
      const isDuplicate =
        data && data.some((row) => !childIds.includes(row.id));

      if (isDuplicate) {
        setErrors((prev) => ({
          ...prev,
          [childId]: "이미 같은 반 친구가 사용 중인 번호입니다.",
        }));
      } else {
        setErrors((prev) => ({ ...prev, [childId]: null }));
      }
    } catch (e) {
      console.error("중복 체크 에러:", e);
    } finally {
      setIsChecking((prev) => ({ ...prev, [childId]: false }));
    }
  };

  /** ⌨️ 등번호 입력 핸들러 (숫자만 허용 + 디바운스 적용) */
  const handleNumberChange = (childId: string, text: string) => {
    const number = text.replace(/[^0-9]/g, ""); // 숫자 이외의 문자 제거
    setBackNumbers((prev) => ({ ...prev, [childId]: number }));
    setIsChecking((prev) => ({ ...prev, [childId]: true })); // 체크 중 상태 시작
    setErrors((prev) => ({ ...prev, [childId]: null })); // 기존 에러 초기화

    setTimeout(() => {
      checkDuplication(childId, number); // 0.4초 후 서버에 중복 확인 요청
    }, 400);
  };

  /** ✅ 특정 자녀의 폼 작성이 완료되었는지 판단 */
  const isChildComplete = (childId: string) => {
    return (
      !!sizes[childId] && // 사이즈 선택됨
      !!backNumbers[childId] && // 등번호 입력됨
      !errors[childId] && // 에러 없음
      !isChecking[childId] // 중복 체크 완료됨
    );
  };

  /** ✅ 모든 자녀의 폼 작성이 완료되었는지 판단 (일괄 저장용) */
  const isAllComplete =
    Array.isArray(childrenData) &&
    childrenData.length > 0 &&
    childrenData.every((child) => isChildComplete(child.id));

  // --- [탭 제어] ---
  const handleNext = () => {
    if (currentIndex < childrenData.length - 1) {
      setCurrentIndex((prev) => prev + 1); // 다음 자녀 탭으로 이동
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  /** 🚀 최종 일괄 저장 로직 */
  const handleSaveAll = async () => {
    if (!isAllComplete) {
      Alert.alert("알림", "모든 학생의 사이즈와 등번호를 정확히 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const childIds = childrenData.map((c) => c.id);

      // [최종 검증] 저장 버튼을 누르는 순간 다른 사람이 해당 번호를 썼는지 한 번 더 확인
      for (const child of childrenData) {
        let query = supabase
          .from("children")
          .select("id")
          .eq("back_number", backNumbers[child.id]);

        if (branchId) query = query.eq("branch_id", branchId);
        else query = query.is("branch_id", null);

        if (child.targetClass)
          query = query.eq("target_class", child.targetClass.trim());

        const { data, error } = await query;
        if (error) throw error;

        const isDuplicate =
          data && data.some((row) => !childIds.includes(row.id));

        if (isDuplicate) {
          setErrors((prev) => ({
            ...prev,
            [child.id]: "그새 누군가 이 번호를 가져갔어요!",
          }));
          Alert.alert(
            "알림",
            `${child.name} 학생의 번호가 이미 사용 중입니다.`,
          );
          setCurrentIndex(childrenData.findIndex((c) => c.id === child.id)); // 중복된 학생 탭으로 강제 이동
          setLoading(false);
          return;
        }
      }

      // [DB 업데이트] 모든 자녀의 정보를 병렬로 업데이트
      const updatePromises = childrenData.map((child) =>
        supabase
          .from("children")
          .update({
            uniform_size: sizes[child.id],
            back_number: backNumbers[child.id],
          })
          .eq("id", child.id),
      );

      const results = await Promise.all(updatePromises);
      if (results.some((res) => res.error)) throw new Error("업데이트 실패");

      Alert.alert("완료", "모든 신청이 완료되었습니다! 🎉");
      onComplete();
    } catch (e) {
      console.error("일괄 저장 에러:", e);
      Alert.alert("오류", "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentChild) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* --- 팝업 헤더 --- */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>👕 유니폼 신청</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            아이들의 사이즈와 등번호를 입력해주세요.
          </Text>

          {/* --- 🚀 다자녀 탭 네비게이션 (자녀가 여러 명일 때만 표시) --- */}
          {childrenData.length > 1 && (
            <View style={styles.tabContainer}>
              {childrenData.map((child, index) => {
                const isActive = index === currentIndex;
                const isDone = isChildComplete(child.id);
                return (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                    onPress={() => setCurrentIndex(index)}
                  >
                    <Text
                      style={[styles.tabText, isActive && styles.tabTextActive]}
                    >
                      {child.name}
                    </Text>
                    {isDone && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={isActive ? "#FFF" : "#10B981"}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* --- 🚀 현재 선택된 자녀 정보 입력 영역 --- */}
          <View style={styles.formContainer}>
            <View style={styles.childHeader}>
              <Text style={styles.childNameText}>{currentChild.name} 학생</Text>
              {currentChild.birth && (
                <Text style={styles.childBirthText}>
                  ({currentChild.birth})
                </Text>
              )}
            </View>

            {/* 1. 사이즈 선택 섹션 */}
            <Text style={styles.sectionTitle}>사이즈 선택</Text>
            <View style={styles.sizeGrid}>
              {sizeOptions.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeChip,
                    sizes[currentChild.id] === size && styles.activeSizeChip,
                  ]}
                  onPress={() =>
                    setSizes((prev) => ({ ...prev, [currentChild.id]: size }))
                  }
                >
                  <Text
                    style={[
                      styles.sizeText,
                      sizes[currentChild.id] === size && styles.activeSizeText,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 2. 등번호 입력 섹션 */}
            <Text style={styles.sectionTitle}>등번호 입력 (1~99)</Text>
            <TextInput
              style={styles.numberInput}
              placeholder="숫자 입력"
              keyboardType="number-pad"
              maxLength={2}
              value={backNumbers[currentChild.id] || ""}
              onChangeText={(text) => handleNumberChange(currentChild.id, text)}
            />

            {/* 3. 실시간 상태 피드백 (로딩/에러/성공) */}
            <View style={styles.statusContainer}>
              {isChecking[currentChild.id] ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : errors[currentChild.id] ? (
                <Text style={styles.errorText}>{errors[currentChild.id]}</Text>
              ) : backNumbers[currentChild.id]?.length > 0 ? (
                <Text style={styles.successText}>사용 가능한 번호입니다.</Text>
              ) : null}
            </View>
          </View>

          {/* --- 🚀 하단 제어 버튼 (이전 / 다음 / 저장) --- */}
          <View style={styles.buttonRow}>
            {childrenData.length > 1 && (
              <TouchableOpacity
                style={[styles.submitBtn, styles.cancelBtn]}
                onPress={currentIndex === 0 ? onClose : handlePrev}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>
                  {currentIndex === 0 ? "취소" : "이전"}
                </Text>
              </TouchableOpacity>
            )}

            {currentIndex < childrenData.length - 1 ? (
              // 다음 학생으로 넘어가기 버튼 (입력이 완료되어야 활성화)
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  styles.saveBtn,
                  !isChildComplete(currentChild.id) && styles.disabledBtn,
                ]}
                onPress={handleNext}
                disabled={!isChildComplete(currentChild.id)}
              >
                <Text style={styles.submitBtnText}>다음 학생 작성</Text>
              </TouchableOpacity>
            ) : (
              // 최종 일괄 저장 버튼 (모든 학생 입력 완료 시 활성화)
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  styles.saveBtn,
                  (!isAllComplete || loading) && styles.disabledBtn,
                  childrenData.length === 1 && { marginLeft: 0 }, // 외동일 경우 취소 버튼 없이 꽉 차게
                ]}
                onPress={handleSaveAll}
                disabled={!isAllComplete || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>일괄 저장하기</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  closeBtn: {
    padding: 4,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 20 },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#1E1B4B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#FFF",
  },

  formContainer: {
    marginBottom: 16,
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  childNameText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    marginRight: 8,
  },
  childBirthText: { fontSize: 15, color: "#64748B", fontWeight: "500" },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 12,
  },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24 },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
    marginBottom: 8,
  },
  activeSizeChip: { backgroundColor: "#1E1B4B", borderColor: "#1E1B4B" },
  sizeText: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  activeSizeText: { color: "#FFF" },
  numberInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
  },
  statusContainer: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
  successText: { color: "#10B981", fontSize: 13, fontWeight: "600" },

  buttonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  submitBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: { backgroundColor: "#F1F5F9" },
  saveBtn: { backgroundColor: "#6366F1" },
  disabledBtn: { backgroundColor: "#CBD5E1" },
  cancelBtnText: { color: "#64748B", fontSize: 16, fontWeight: "bold" },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
