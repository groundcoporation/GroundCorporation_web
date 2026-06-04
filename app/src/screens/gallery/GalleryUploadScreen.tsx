import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../lib/supabase";
import { Picker } from "@react-native-picker/picker"; // 🚀 지점 선택용 드롭다운 추가

// 🚀 [추가] 권한 스위치와 내 지점(branchId) 정보를 가져오기 위해 useAuth 임포트
import { useAuth } from "../../context/AuthContext";

export default function GalleryUploadScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  // 🚀 [리팩토링 완료] role 대신 명품 스위치 isAdmin을 가져옵니다!
  const { branchId: myBranchId, isAdmin } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // 💡 상세 내용 상태 추가
  const [image, setImage] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 🚀 [수정] 게시 대상 지점 ID 상태
  // 어드민은 기본값이 전체공유(null), 직원은 본인 지점(myBranchId)
  const [targetBranchId, setTargetBranchId] = useState<string | null>(
    isAdmin ? null : myBranchId,
  );
  const [branches, setBranches] = useState<any[]>([]); // 어드민용 지점 목록
  const [myBranchName, setMyBranchName] = useState(""); // 코치용 지점 이름 표시용

  // 🚀 [수정] 화면 진입 시 지점 정보 로드 (isAdmin 스위치 적용)
  useEffect(() => {
    if (isAdmin) {
      fetchBranches();
    } else {
      fetchMyBranchName();
    }
  }, [isAdmin, myBranchId]);

  const fetchBranches = async () => {
    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .order("display_order", { ascending: true });
      if (data) setBranches(data);
    } catch (e) {
      console.error("지점 목록 로드 실패:", e);
    }
  };

  const fetchMyBranchName = async () => {
    if (!myBranchId) return;
    try {
      const { data } = await supabase
        .from("branches")
        .select("name")
        .eq("id", myBranchId)
        .single();
      if (data) setMyBranchName(data.name);
    } catch (e) {
      console.error("지점명 로드 실패:", e);
    }
  };

  // 1️⃣ 스마트폰 갤러리 열기
  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "권한 필요",
        "사진을 업로드하려면 갤러리 접근 권한이 필요합니다.",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  // 2️⃣ 수퍼베이스에 업로드 및 DB 저장
  const handleUpload = async () => {
    if (!image) {
      Alert.alert("알림", "업로드할 사진을 선택해주세요.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("알림", "제목을 입력해주세요.");
      return;
    }

    setIsUploading(true);

    try {
      // 1단계: 사진 파일 이름을 고유하게 만들기
      const ext = image.uri.substring(image.uri.lastIndexOf(".") + 1);
      const fileName = `${Date.now()}.${ext}`;

      // 2단계: Supabase Storage 'gallery' 버킷에 사진 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, decode(image.base64), {
          contentType: `image/${ext}`,
        });

      if (uploadError) throw uploadError;

      // 3단계: 업로드된 사진의 Public URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from("gallery").getPublicUrl(fileName);

      // 4단계: gallery_posts 테이블에 글 저장하기 (content 추가)
      const { error: dbError } = await supabase.from("gallery_posts").insert({
        title: title,
        content: content, // 💡 상세 내용 추가
        image_url: publicUrl,
        // 🚀 [수정] 선택된 지점 또는 자동 지정된 지점 ID를 넣어줍니다!
        branch_id: targetBranchId,
      });

      if (dbError) throw dbError;

      Alert.alert("업로드 성공!", "갤러리에 게시물이 등록되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error("업로드 에러:", error);
      Alert.alert("업로드 실패", "게시물을 올리는 중 문제가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={isUploading}
          >
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시물 작성</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* 🚀 [수정] 지점 설정 영역 (isAdmin 스위치 적용) */}
          <View style={styles.branchSection}>
            <Text style={styles.label}>게시 대상 설정</Text>
            {isAdmin ? (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={targetBranchId}
                  onValueChange={(itemValue) => setTargetBranchId(itemValue)}
                  style={styles.picker}
                  enabled={!isUploading}
                >
                  <Picker.Item label="🌐 전체 지점 공용 사진" value={null} />
                  {branches.map((b) => (
                    <Picker.Item
                      key={b.id}
                      label={`📍 ${b.name}`}
                      value={b.id}
                    />
                  ))}
                </Picker>
              </View>
            ) : (
              <View style={styles.readOnlyBranch}>
                <Ionicons name="location-sharp" size={16} color="#4F46E5" />
                <Text style={styles.readOnlyBranchText}>
                  📍 {myBranchName || "로딩 중..."} 게시판에 등록됩니다.
                </Text>
              </View>
            )}
          </View>

          {/* 사진 선택 영역 */}
          <Text style={styles.label}>사진 등록</Text>
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={pickImage}
            disabled={isUploading}
          >
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="camera-outline" size={48} color="#94A3B8" />
                <Text style={styles.placeholderText}>
                  여기를 눌러 사진을 선택하세요
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 💡 제목 입력 영역 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>제목</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="예: 5월 1주차 유치부 체육 수업"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
              editable={!isUploading}
            />
          </View>

          {/* 💡 상세 내용 입력 영역 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>상세 내용</Text>
            <TextInput
              style={styles.contentInput}
              placeholder="활동에 대한 상세한 설명을 적어주세요."
              value={content}
              onChangeText={setContent}
              multiline
              editable={!isUploading}
            />
          </View>
        </ScrollView>

        {/* 업로드 버튼 */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <TouchableOpacity
            style={[styles.uploadBtn, (!image || !title) && styles.disabledBtn]}
            onPress={handleUpload}
            disabled={isUploading || !image || !title}
          >
            {isUploading ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator
                  color="#FFF"
                  size="small"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.uploadBtnText}>등록하는 중...</Text>
              </View>
            ) : (
              <Text style={styles.uploadBtnText}>갤러리에 등록하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  content: { padding: 24 },

  /* 🚀 추가된 지점 설정 스타일 */
  branchSection: {
    marginBottom: 24,
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  pickerWrapper: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  picker: { height: 50, width: "100%" },
  readOnlyBranch: { flexDirection: "row", alignItems: "center" },
  readOnlyBranchText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "700",
  },

  label: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },

  imagePicker: {
    width: "100%",
    height: 250,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  previewImage: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center" },
  placeholderText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },

  inputContainer: { marginBottom: 20 },
  titleInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1E293B",
  },
  contentInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1E293B",
    minHeight: 120,
    textAlignVertical: "top",
  },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  uploadBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  disabledBtn: { backgroundColor: "#CBD5E1" },
  uploadBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
