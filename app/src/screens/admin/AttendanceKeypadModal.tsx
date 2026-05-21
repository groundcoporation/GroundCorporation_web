import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";

interface AttendeeInfo {
  id: string; // child_id or user_id
  name: string; // child_name or user_name
  birthDate: string; // child_birth or user_birth_date (YYYYMMDD format)
  type: "child" | "parent";
  parentId?: string; // parent_id if type is child
  parentName?: string; // parent_name if type is child
}

interface AttendanceKeypadModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectAttendee: (attendee: AttendeeInfo) => void;
  selectedBranchId: string; // To filter children/users by branch
}

const AttendanceKeypadModal: React.FC<AttendanceKeypadModalProps> = ({
  isVisible,
  onClose,
  onSelectAttendee,
  selectedBranchId,
}) => {
  const [keypadInput, setKeypadInput] = useState("");
  const [searchResults, setSearchResults] = useState<AttendeeInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeInfo | null>(
    null,
  );

  const handleKeypadPress = (digit: string) => {
    if (keypadInput.length < 4) {
      setKeypadInput((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setKeypadInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setKeypadInput("");
    setSearchResults([]);
    setSelectedAttendee(null);
  };

  useEffect(() => {
    if (keypadInput.length === 4) {
      searchAttendees(keypadInput);
    } else {
      setSearchResults([]);
      setSelectedAttendee(null);
    }
  }, [keypadInput, selectedBranchId]); // selectedBranchId가 변경될 때도 검색 재실행

  const calculateAge = (birthDate: string | null | undefined) => {
    if (!birthDate || birthDate.length !== 8) return 0;
    try {
      const year = parseInt(birthDate.substring(0, 4));
      const currentYear = dayjs().tz().year(); // 한국 시간 기준 현재 연도
      return currentYear - year + 1; // 한국 나이
    } catch (e) {
      return 0;
    }
  };

  const searchAttendees = async (last4Digits: string) => {
    setSearchLoading(true);
    setSearchResults([]);
    setSelectedAttendee(null);

    try {
      const results: AttendeeInfo[] = [];

      // 1. 'users' 테이블에서 전화번호 뒷 4자리가 일치하는 사용자 검색 (부모님)
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, phone, birth_date")
        .eq("branch_id", selectedBranchId) // 현재 선택된 지점의 사용자만
        .ilike("phone", `%${last4Digits}`); // 전화번호 뒷 4자리 검색

      if (usersError) throw usersError;

      if (usersData && usersData.length > 0) {
        for (const user of usersData) {
          // 해당 부모의 자녀 정보도 함께 검색
          const { data: childrenData, error: childrenError } = await supabase
            .from("children")
            .select("id, child_name, child_birth")
            .eq("parent_id", user.id);

          if (childrenError) throw childrenError;

          if (childrenData && childrenData.length > 0) {
            for (const child of childrenData) {
              results.push({
                id: child.id,
                name: child.child_name,
                birthDate: child.child_birth,
                type: "child",
                parentId: user.id,
                parentName: user.name,
              });
            }
          } else {
            // 자녀가 없는 부모는 본인으로 간주 (성인반 등)
            results.push({
              id: user.id,
              name: user.name,
              birthDate: user.birth_date,
              type: "parent",
            });
          }
        }
      }

      // 중복 제거 (동일한 child_id + type 조합)
      const uniqueResults = Array.from(
        new Map(results.map((item) => [item.id + item.type, item])).values(),
      );
      setSearchResults(uniqueResults);
    } catch (error: any) {
      console.error("Attendee search failed:", error.message);
      Alert.alert("오류", "사용자 검색 중 문제가 발생했습니다.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedAttendee) {
      onSelectAttendee(selectedAttendee);
      handleClear(); // 선택 후 상태 초기화
      onClose();
    } else {
      Alert.alert("알림", "출결할 대상을 선택해주세요.");
    }
  };

  const renderKeypad = () => (
    <View style={styles.keypadContainer}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <TouchableOpacity
          key={num}
          style={styles.keypadButton}
          onPress={() => handleKeypadPress(String(num))}
        >
          <Text style={styles.keypadButtonText}>{num}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.keypadButton} onPress={handleClear}>
        <Text style={styles.keypadButtonText}>C</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.keypadButton}
        onPress={() => handleKeypadPress("0")}
      >
        <Text style={styles.keypadButtonText}>0</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.keypadButton} onPress={handleBackspace}>
        <Ionicons name="backspace-outline" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>전화번호 뒷 4자리 입력</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.keypadDisplay}
            value={keypadInput}
            editable={false}
            placeholder="****"
            placeholderTextColor="#999"
            maxLength={4}
          />

          {renderKeypad()}

          {searchLoading ? (
            <ActivityIndicator
              size="large"
              color="#6366F1"
              style={{ marginTop: 20 }}
            />
          ) : (
            keypadInput.length === 4 &&
            (searchResults.length > 0 ? (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsHeader}>출결 대상 선택:</Text>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id + item.type}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.attendeeItem,
                        selectedAttendee?.id === item.id &&
                          selectedAttendee?.type === item.type &&
                          styles.selectedAttendeeItem,
                      ]}
                      onPress={() => setSelectedAttendee(item)}
                    >
                      <Text style={styles.attendeeName}>
                        {item.name} ({calculateAge(item.birthDate)}세)
                        {item.type === "child" &&
                          item.parentName &&
                          ` (학부모: ${item.parentName})`}
                      </Text>
                      <Ionicons
                        name={
                          selectedAttendee?.id === item.id &&
                          selectedAttendee?.type === item.type
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={20}
                        color={
                          selectedAttendee?.id === item.id &&
                          selectedAttendee?.type === item.type
                            ? "#6366F1"
                            : "#999"
                        }
                      />
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmSelection}
                  disabled={!selectedAttendee}
                >
                  <Text style={styles.confirmButtonText}>출결 처리</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.noResultsText}>
                일치하는 사용자를 찾을 수 없습니다.
              </Text>
            ))
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  keypadDisplay: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  keypadContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20,
  },
  keypadButton: {
    width: "30%", // Roughly 3 buttons per row
    aspectRatio: 1.5, // Make buttons slightly rectangular
    justifyContent: "center",
    alignItems: "center",
    margin: "1.5%",
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  resultsContainer: {
    marginTop: 20,
    maxHeight: 300, // 결과 목록 영역을 조금 더 확장
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  attendeeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedAttendeeItem: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  attendeeName: {
    fontSize: 16,
    color: "#333",
  },
  confirmButton: {
    backgroundColor: "#6366F1",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  noResultsText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#999",
  },
});

export default AttendanceKeypadModal;
