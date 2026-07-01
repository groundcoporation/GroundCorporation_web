import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; 
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function SignUpScreen({ navigation, route }: any) { // 🚀 route 추가
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
  const [referralCode, setReferralCode] = useState(''); // 🚀 [추가] 추천인 코드 상태

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordMatch, setIsPasswordMatch] = useState(true);

  // 🚀 딥링크(route)를 통해 넘어온 추천인 코드가 있다면 자동 세팅
  useEffect(() => {
    if (route?.params?.referralCode) {
      setReferralCode(route.params.referralCode);
    }
  }, [route?.params]);

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
    // 🚀 [추가] 양끝 공백 및 모든 공백을 제거한 깔끔한 아이디와 이메일 생성
    const cleanUsername = username.replace(/\s/g, ''); 
    const cleanEmail = email.trim(); 

    // 1. 필수 입력 확인 (cleanUsername, cleanEmail 사용)
    if (!cleanUsername || !password || !confirmPassword || !name || !cleanEmail || !phone || !birthDate) {
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
      // 3. 아이디 중복 체크 (cleanUsername 사용)
      const isDuplicate = await checkDuplicateUsername(cleanUsername);
      if (isDuplicate) {
        Alert.alert('알림', '이미 사용 중인 아이디입니다.');
        setIsLoading(false);
        return;
      }

      // 4. 추천인 검증 (DB에서 signup_bonus 값과 함께 확인)
      let referrerData = null;
      let signupBonus = 0;
      let newUserLineage: string[] = []; // 🚀 [추가] 신규 가입자의 족보(Lineage)를 담을 빈 배열

      // 포인트 값 가져오기
      const { data: bonusData } = await supabase
        .from('point_settings')
        .select('value')
        .eq('key', 'signup_bonus')
        .maybeSingle();
      signupBonus = bonusData?.value || 0;

      if (referralCode) {
        // 🚀 [수정] 추천인의 id, name, points 뿐만 아니라 족보(lineage)와 추천수(referral_count)도 같이 가져옵니다!
        const { data } = await supabase
          .from('users')
          .select('id, name, points, lineage, referral_count') 
          .eq('username', referralCode.replace(/\s/g, '')) // 추천인 코드도 공백 제거
          .maybeSingle();
          
        referrerData = data;
        
        if (!referrerData) {
          Alert.alert('오류', '존재하지 않는 추천인 코드입니다.');
          setIsLoading(false);
          return;
        }

        // 🚀 [추가: 족보 생성 로직]
        // 나를 초대한 사람의 족보를 그대로 가져오고, 그 맨 뒤에 '초대한 사람의 ID'를 붙여줍니다.
        newUserLineage = [...(referrerData.lineage || []), referrerData.id];
      }

      // 5. Supabase Auth 가입 (cleanEmail 사용)
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: cleanEmail, 
        password: password 
      });

      if (authError) throw authError;

      // 6. Auth 성공 시 상세 정보 저장 및 포인트 지급
      if (authData.user) {
        // [B] 가입자 정보 저장 (먼저 저장하여 users 테이블에 신규 가입자 ID가 등록되게 함)
        const { error: dbError } = await supabase.from('users').insert([{
            id: authData.user.id,
            username: cleanUsername,
            email: cleanEmail,
            name: name,
            phone: phone.replace(/-/g, ''),
            birth_date: birthDate.replace(/-/g, ''),
            branch_id: branchId,
            role: 'user',
            referred_by: referralCode ? referralCode.replace(/\s/g, '') : null,
            points: signupBonus, //추천인 있든없든 본인한테는 가입시 1000포인트 지급
            lineage: newUserLineage // 🚀 [추가] 방금 만든 족보(계보) 배열을 DB에 저장!
        }]);

        if (dbError) throw dbError;

        if (referrerData) {
          // [A] 추천인 포인트 지급 & 추천인 수 증가 & 적립 로그 기록을 안전한 RPC로 한 방에 처리!
          const { error: rpcError } = await supabase.rpc('process_referral_points', {
            referrer_id: referrerData.id,
            new_user_id: authData.user.id,
            bonus_amount: signupBonus,
            new_user_name: name
          });
          if (rpcError) console.error('추천인 포인트 RPC 처리 에러:', rpcError);
        }

        // [C] 가입자 로그 기록
        if (referrerData) {
            // 추천인이 있을 때의 기록
            await supabase.from('point_logs').insert({ 
              user_id: authData.user.id, 
              amount: signupBonus, 
              type: 'earn',
              reason: `추천인 등록 가입 포인트 적립 (추천인: ${referrerData.name || referralCode.replace(/\s/g, '')})`, 
              related_user_id: referrerData.id 
            });
        } else {
            // 🚀 추천인이 없을 때의 기록 (기본 가입 축하금 영수증)
            await supabase.from('point_logs').insert({ 
              user_id: authData.user.id, 
              amount: signupBonus, 
              type: 'earn',
              reason: `회원가입 축하 기본 포인트`, 
              related_user_id: authData.user.id 
            });
        }

        // =================================================================
        // 추천인(referrerData) 유무에 따라 알림 메시지를 다르게 띄움
        // =================================================================
        const successMessage = referrerData 
          ? `회원가입이 완료되었습니다! (추천 포인트 ${signupBonus}P 지급)` 
          : '회원가입이 완료되었습니다!';

        // =================================================================
        // 🚀 [추가] 어뷰징 방어: 가입 성공 시 temp_redirects에서 내 IP 기록 삭제
        // =================================================================
        try {
          const ipResponse = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipResponse.json();
          const myIp = ipData.ip;

          await supabase
            .from('temp_redirects')
            .delete()
            .eq('ip_address', myIp);
        } catch (cleanupError) {
          console.log('임시 흔적 삭제 중 에러 발생 (무시 가능):', cleanupError);
        }
        // =================================================================

        Alert.alert('성공', successMessage, [{ text: '확인', onPress: () => navigation.navigate('Login') }]);
        
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
          <TextInput 
            style={styles.input} 
            placeholder="아이디 (공백 없이 입력)" 
            placeholderTextColor="#999" // 🚀 [추가] 힌트 색상 명시
            value={username} 
            onChangeText={(text) => setUsername(text.replace(/\s/g, ''))} 
            autoCapitalize="none" 
          />
          
          <View style={styles.passwordWrapper}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }]} 
              placeholder="비밀번호 (영문 필수, 7자 이상)" 
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
              secureTextEntry={!showConfirmPassword} 
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#888" />
            </TouchableOpacity>
          </View>
          {!isPasswordMatch && <Text style={styles.errorText}>비밀번호가 일치하지 않습니다.</Text>}

          <TextInput 
            style={[styles.input, { marginTop: 12 }]} 
            placeholder="이메일" 
            placeholderTextColor="#999"
            value={email} 
            onChangeText={(text) => setEmail(text.replace(/\s/g, ''))} 
            keyboardType="email-address" 
            autoCapitalize="none" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>사용자 정보</Text>
          <TextInput style={styles.input} placeholder="이름" placeholderTextColor="#999" value={name} onChangeText={setName} />
          <TextInput 
            style={styles.input} 
            placeholder="휴대폰 번호" 
            placeholderTextColor="#999"
            value={phone} 
            onChangeText={(text) => setPhone(formatPhoneNumber(text))} 
            keyboardType="phone-pad" 
            maxLength={13} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="생년월일 (예: 19940101)" 
            placeholderTextColor="#999"
            value={birthDate} 
            onChangeText={(text) => setBirthDate(formatBirthDate(text))} 
            keyboardType="number-pad" 
            maxLength={10} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="추천인 코드 (선택)" 
            placeholderTextColor="#999"
            value={referralCode} 
            onChangeText={(text) => setReferralCode(text.replace(/\s/g, ''))} 
            autoCapitalize="none"
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
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 15, 
    fontSize: 16, 
    backgroundColor: '#fafafa', 
    marginBottom: 12,
    color: '#000' // 🚀 [핵심 수정] 다크 모드 충돌 방지: 어떤 폰이든 무조건 텍스트가 검은색으로 보이게 강제 설정!
  },
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