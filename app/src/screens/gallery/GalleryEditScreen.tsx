import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { Picker } from "@react-native-picker/picker"; // 🚀 지점 선택용 드롭다운 추가

// 🚀 [추가] 권한 스위치와 내 지점(branchId) 정보를 가져오기 위해 useAuth 임포트
import { useAuth } from "../../context/AuthContext";

export default function GalleryEditScreen({ route, navigation }: any) {
  // 🚀 [리팩토링 완료] role 대신 명품 스위치 isAdmin을 가져옵니다!
  const { branchId: myBranchId, isAdmin } = useAuth();

  const { post } = route.params; // 기존 데이터
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || ''); // 💡 상세 내용 상태 추가
  const [image, setImage] = useState<any>(null); // 새로 선택한 이미지
  const [isUpdating, setIsUpdating] = useState(false);

  // 🚀 [추가] 수정될 대상 지점 ID 상태 (기본값은 게시물의 기존 branch_id)
  const [targetBranchId, setTargetBranchId] = useState<string | null>(post.branch_id);
  const [branches, setBranches] = useState<any[]>([]); // 어드민용 지점 목록
  const [myBranchName, setMyBranchName] = useState(""); // 코치용 지점 이름

  // 🚀 [수정] 지점 정보 로드 (isAdmin 스위치 적용)
  useEffect(() => {
    if (isAdmin) {
      fetchBranches();
    } else {
      fetchMyBranchName();
    }
  }, [isAdmin]);

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
      const { data } = await supabase.from("branches").select("name").eq("id", myBranchId).single();
      if (data) setMyBranchName(data.name);
    } catch (e) {
      console.error("지점명 로드 실패:", e);
    }
  };

  // 1️⃣ 새 이미지 선택
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  // 2️⃣ 수정 완료 핸들러
  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert("알림", "제목을 입력해주세요.");
      return;
    }

    setIsUpdating(true);
    try {
      let finalImageUrl = post.image_url; // 기본값은 기존 이미지 URL

      // 💡 새 이미지가 선택되었다면 새로 업로드 진행
      if (image) {
        const ext = image.uri.substring(image.uri.lastIndexOf('.') + 1);
        const fileName = `${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gallery')
          .upload(fileName, decode(image.base64), { contentType: `image/${ext}` });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('gallery')
          .getPublicUrl(fileName);
        
        finalImageUrl = publicUrl; // 새 URL로 교체
      }

      // 3️⃣ DB 업데이트 (content 및 branch_id 추가)
      const { error: dbError } = await supabase
        .from('gallery_posts')
        .update({ 
          title: title,
          content: content, // 💡 상세 내용 업데이트
          image_url: finalImageUrl,
          branch_id: targetBranchId // 🚀 [추가] 수정된 지점 정보 반영
        })
        .eq('id', post.id);

      if (dbError) throw dbError;

      Alert.alert("성공", "수정이 완료되었습니다.", [
        { text: "확인", onPress: () => navigation.pop(2) } // 리스트로 바로 돌아가기
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert("오류", "수정 중 문제가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시물 수정</Text>
          <TouchableOpacity onPress={handleUpdate} disabled={isUpdating}>
            {isUpdating ? <ActivityIndicator size="small" color="#4F46E5" /> : <Text style={styles.saveBtn}>완료</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          {/* 🚀 [추가] 지점 설정 영역 (수정 시에도 어디 게시물인지 확인/변경 가능) */}
          <View style={styles.branchSection}>
            <Text style={styles.label}>게시 대상 설정</Text>
            {/* 🚀 [적용] isAdmin 스위치 사용! */}
            {isAdmin ? (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={targetBranchId}
                  onValueChange={(itemValue) => setTargetBranchId(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="🌐 전체 지점 공용" value={null} />
                  {branches.map((b) => (
                    <Picker.Item key={b.id} label={`📍 ${b.name}`} value={b.id} />
                  ))}
                </Picker>
              </View>
            ) : (
              <View style={styles.readOnlyBranch}>
                <Ionicons name="location-sharp" size={16} color="#4F46E5" />
                <Text style={styles.readOnlyBranchText}>
                  📍 {myBranchName || "지점"} 게시물입니다.
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.label}>사진 변경 (탭하여 선택)</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Image 
              source={{ uri: image ? image.uri : post.image_url }} 
              style={styles.previewImage} 
            />
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* 💡 제목 입력칸 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>제목</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력하세요 (예: 유치부 체육 수업)"
            />
          </View>

          {/* 💡 상세 내용 입력칸 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>상세 내용</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="활동에 대한 상세한 설명을 적어주세요."
              multiline
            />
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  saveBtn: { fontSize: 16, fontWeight: '700', color: '#4F46E5' },
  content: { padding: 24 },
  
  /* 🚀 추가된 지점 설정 스타일 */
  branchSection: { marginBottom: 24, padding: 15, backgroundColor: '#F8FAFC', borderRadius: 12 },
  pickerWrapper: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  picker: { height: 50, width: "100%" },
  readOnlyBranch: { flexDirection: "row", alignItems: "center" },
  readOnlyBranchText: { marginLeft: 6, fontSize: 14, color: "#4F46E5", fontWeight: "700" },

  imagePicker: { width: '100%', height: 250, borderRadius: 16, overflow: 'hidden', marginBottom: 24, backgroundColor: '#F1F5F9' },
  previewImage: { width: '100%', height: '100%' },
  cameraIconBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },
  
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  
  titleInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 16 },
  contentInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 16, minHeight: 140, textAlignVertical: 'top' }
});