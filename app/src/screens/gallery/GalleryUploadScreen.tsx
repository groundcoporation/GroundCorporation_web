import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer'; // 👈 이미지를 서버가 이해하는 형태로 변환
import { supabase } from '../../lib/supabase';

export default function GalleryUploadScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1️⃣ 스마트폰 갤러리 열기
  const pickImage = async () => {
    // 갤러리 접근 권한 요청 (최초 1회)
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("권한 필요", "사진을 업로드하려면 갤러리 접근 권한이 필요합니다.");
      return;
    }

    // 사진 선택 창 띄우기
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // 사진 자르기 허용
      aspect: [4, 3],      // 사진 비율
      quality: 0.5,        // 💡 핵심! 용량 압축 (0.0 ~ 1.0) - 0.5면 화질 유지하면서 용량 대폭 감소
      base64: true,        // 💡 수퍼베이스 업로드를 위해 꼭 필요함
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0]); // 선택한 사진 상태에 저장
    }
  };

  // 2️⃣ 수퍼베이스에 업로드 및 DB 저장
  const handleUpload = async () => {
    if (!image) {
      Alert.alert("알림", "업로드할 사진을 선택해주세요.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("알림", "사진에 대한 짧은 설명을 입력해주세요.");
      return;
    }

    setIsUploading(true);

    try {
      // 1단계: 사진 파일 이름을 고유하게 만들기 (예: 17092301923.jpeg)
      const ext = image.uri.substring(image.uri.lastIndexOf('.') + 1); // 확장자 추출
      const fileName = `${Date.now()}.${ext}`;

      // 2단계: Supabase Storage 'gallery' 버킷에 사진 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, decode(image.base64), {
          contentType: `image/${ext}`,
        });

      if (uploadError) throw uploadError;

      // 3단계: 업로드된 사진의 Public URL(인터넷 주소) 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);

      // 4단계: gallery_posts 테이블에 글 저장하기
      const { error: dbError } = await supabase
        .from('gallery_posts')
        .insert({
          title: title,
          image_url: publicUrl,
          // branch_id: '...' // 💡 나중에 관리자가 소속된 지점 ID를 여기에 넣어줍니다!
        });

      if (dbError) throw dbError;

      Alert.alert("업로드 성공!", "갤러리에 사진이 등록되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() }
      ]);
      
    } catch (error: any) {
      console.error("업로드 에러:", error);
      Alert.alert("업로드 실패", "사진을 올리는 중 문제가 발생했습니다.");
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
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={isUploading}>
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>사진 올리기</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          {/* 사진 선택 영역 */}
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
                <Text style={styles.placeholderText}>여기를 눌러 사진을 선택하세요</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 제목 입력 영역 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>내용</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 신나는 체육 시간입니다!"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
              editable={!isUploading}
            />
          </View>

        </ScrollView>

        {/* 업로드 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.uploadBtn, (!image || !title) && styles.disabledBtn]} 
            onPress={handleUpload}
            disabled={isUploading || !image || !title}
          >
            {isUploading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 8 }} />
                <Text style={styles.uploadBtnText}>사진 올리는 중...</Text>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  content: { padding: 24 },
  
  imagePicker: { 
    width: '100%', 
    height: 250, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 24
  },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  placeholderText: { marginTop: 12, fontSize: 15, color: '#64748B', fontWeight: '600' },
  
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 15, color: '#1E293B' },
  
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  uploadBtn: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#CBD5E1' },
  uploadBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }
});