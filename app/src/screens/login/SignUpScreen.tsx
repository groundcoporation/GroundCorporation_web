import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; 
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function SignUpScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(false);

  // 상태 관리
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [branchId, setBranchId] = useState('unassigned');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordMatch, setIsPasswordMatch] = useState(true);

  // 비밀번호 일치 실시간 체크
  useEffect(() => {
    if (confirmPassword.length > 0) {
      setIsPasswordMatch(password === confirmPassword);
    } else {
      setIsPasswordMatch(true);
    }
  }, [password, confirmPassword]);

  // 📱 휴대폰 번호 포맷팅 (010-0000-0000)
  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  // 📅 생년월일 포맷팅 (1994-01-01)
  const formatBirthDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  };

  // 아이디 중복 체크 함수
  const checkDuplicateUsername = async (uname: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', uname)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') return false;
      return !!data;
    } catch (e) {
      return false;
    }
  };

  const handleSignUp = async () => {
    // 1. 필수 입력 확인
    if (!username || !password || !confirmPassword || !name || !email || !phone || !birthDate) {
      Alert.alert('알림', '모든 항목을 입력해주세요.');
      return;
    }

    // 생년월일 8자리 체크 (하이픈 포함 10자)
    if (birthDate.length < 10) {
      Alert.alert('알림', '생년월일 8자리를 정확히 입력해주세요.');
      return;
    }

    // 2. 비밀번호 정책
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{7,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert('비밀번호 오류', '비밀번호는 영문을 포함하고 숫자 또는 특수문자를 조합하여 7자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      // 3. 아이디 중복 체크
      const isDuplicate = await checkDuplicateUsername(username);
      if (isDuplicate) {
        Alert.alert('알림', '이미 사용 중인 아이디입니다.');
        setIsLoading(false);
        return;
      }

      // 4. Supabase Auth 가입
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: email, 
        password: password 
      });

      if (authError) throw authError;

      // 5. Auth 성공 시 users 테이블에 상세 정보 저장
      if (authData.user) {
        const { error: dbError } = await supabase.from('users').insert([{
            id: authData.user.id,
            username: username,
            email: email,
            name: name,
            phone: phone.replace(/-/g, ''), // 하이픈 제거 후 저장
            birth_date: birthDate.replace(/-/g, ''), // 👈 생년월일 하이픈 제거 후 저장 (8자리 숫자)
            branch_id: branchId,
            role: 'user'
        }]);

        if (dbError) throw dbError;

        Alert.alert('성공', '회원가입이 완료되었습니다!', [{ text: '확인', onPress: () => navigation.navigate('Login') }]);
      }
    } catch (error: any) {
      Alert.alert('가입 에러', error.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAwareScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        enableOnAndroid={true}
        extraScrollHeight={150}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>회원가입</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>로그인 정보</Text>
          <TextInput style={styles.input} placeholder="아이디" value={username} onChangeText={setUsername} autoCapitalize="none" />
          
          <View style={styles.passwordWrapper}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }]} 
              placeholder="비밀번호 (영문 필수, 7자 이상)" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry={!showPassword} 
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={[styles.passwordWrapper, { marginTop: 12 }]}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }, !isPasswordMatch && styles.inputError]} 
              placeholder="비밀번호 확인" 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
              secureTextEntry={!showConfirmPassword} 
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#888" />
            </TouchableOpacity>
          </View>
          {!isPasswordMatch && <Text style={styles.errorText}>비밀번호가 일치하지 않습니다.</Text>}

          <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>사용자 정보</Text>
          <TextInput style={styles.input} placeholder="이름" value={name} onChangeText={setName} />
          <TextInput 
            style={styles.input} 
            placeholder="휴대폰 번호" 
            value={phone} 
            onChangeText={(text) => setPhone(formatPhoneNumber(text))} 
            keyboardType="phone-pad" 
            maxLength={13} 
          />
          {/* 📅 생년월일 입력 섹션 */}
          <TextInput 
            style={styles.input} 
            placeholder="생년월일 (예: 19940101)" 
            value={birthDate} 
            onChangeText={(text) => setBirthDate(formatBirthDate(text))} 
            keyboardType="number-pad" 
            maxLength={10} 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>소속 지점 선택</Text>
          <View style={styles.branchContainer}>
            {[{ id: 'branch_1', name: '시흥본점' }, { id: 'branch_2', name: '영종도점' }, { id: 'unassigned', name: '미정' }].map((branch) => (
              <TouchableOpacity key={branch.id} style={[styles.branchButton, branchId === branch.id && styles.branchButtonActive]} onPress={() => setBranchId(branch.id)}>
                <Text style={[styles.branchText, branchId === branch.id && styles.branchTextActive]}>{branch.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.signUpButtonText}>가입하기</Text>}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 60 },
  backButton: { marginTop: 10, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  section: { marginBottom: 25 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#555' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, fontSize: 16, backgroundColor: '#fafafa', marginBottom: 12 },
  inputError: { borderColor: '#FF3B30' },
  errorText: { color: '#FF3B30', fontSize: 13, marginTop: 5, marginBottom: 10, marginLeft: 5 },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  eyeButton: { position: 'absolute', right: 15, top: 15 },
  branchContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  branchButton: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#fff' },
  branchButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  branchText: { color: '#666', fontWeight: '500' },
  branchTextActive: { color: '#fff', fontWeight: 'bold' },
  signUpButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  signUpButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});