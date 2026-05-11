import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function LoginScreen({ navigation }: any) {
  // 사용자가 입력하는 값 (아이디 또는 이메일)
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 💡 비밀번호 보이기 상태 추가

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedId = await AsyncStorage.getItem('saved_id');
      const savedRememberId = await AsyncStorage.getItem('remember_id') === 'true';
      const savedAutoLogin = await AsyncStorage.getItem('auto_login') === 'true';

      setRememberId(savedRememberId);
      setAutoLogin(savedAutoLogin);
      if (savedRememberId && savedId) {
        setIdentifier(savedId);
      }
    } catch (e) {
      console.log('불러오기 에러:', e);
    }
  };

  const saveCredentials = async () => {
    try {
      await AsyncStorage.setItem('remember_id', rememberId.toString());
      await AsyncStorage.setItem('auto_login', autoLogin.toString());
      if (rememberId) {
        await AsyncStorage.setItem('saved_id', identifier.trim());
      } else {
        await AsyncStorage.removeItem('saved_id');
      }
    } catch (e) {
      console.log('저장 에러:', e);
    }
  };

  /**
   * 🚀 아이디 -> 이메일 변환 후 로그인 로직
   */
  const handleSignIn = async () => {
    if (!identifier || !password) {
      Alert.alert('알림', '아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      let loginEmail = identifier.trim();

      // 1. 입력된 값이 이메일 형식이 아닐 경우 (@가 없을 경우)
      if (!loginEmail.includes('@')) {
        // public.users 테이블에서 username이 일치하는 사용자의 email을 가져옵니다.
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', loginEmail)
          .maybeSingle();

        if (userError || !userData) {
          Alert.alert('로그인 실패', '존재하지 않는 아이디입니다.');
          setIsLoading(false);
          return;
        }

        // DB에서 찾은 이메일로 교체
        loginEmail = userData.email;
      }

      // 2. 최종 결정된 이메일과 비밀번호로 Supabase Auth 로그인
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) {
        Alert.alert('로그인 실패', '아이디 또는 비밀번호가 일치하지 않습니다.');
        setIsLoading(false);
        return;
      }

      // 3. 성공 시 처리
      await saveCredentials();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (error: any) {
      Alert.alert('에러', '로그인 중 예기치 못한 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>학부모 계정으로 로그인하세요.</Text>

      <TextInput
        style={styles.input}
        placeholder="아이디" // 👈 이메일 문구 삭제
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />

      {/* 💡 비밀번호 입력 섹션 (눈 모양 아이콘 추가) */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword} // 💡 showPassword 상태에 따라 가림/보임
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons 
            name={showPassword ? "eye-outline" : "eye-off-outline"} 
            size={22} 
            color="#888" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity 
          style={styles.checkboxWrapper}
          onPress={() => {
            setRememberId(!rememberId);
            if (rememberId) setAutoLogin(false);
          }}
        >
          <Ionicons 
            name={rememberId ? "checkbox" : "square-outline"} 
            size={20} 
            color="teal" 
          />
          <Text style={styles.checkboxText}>아이디 기억하기</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkboxWrapper}
          onPress={() => {
            setAutoLogin(!autoLogin);
            if (!autoLogin) setRememberId(true);
          }}
        >
          <Ionicons 
            name={autoLogin ? "checkbox" : "square-outline"} 
            size={20} 
            color="teal" 
          />
          <Text style={styles.checkboxText}>자동 로그인</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
        onPress={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginButtonText}>로그인</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.linkTextBlue}>간편 회원가입</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('FindAuth')}>
          <Text style={styles.linkTextGrey}>아이디/비밀번호 찾기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 15, marginBottom: 15, fontSize: 16 },
  
  // 💡 비밀번호 입력창 스타일 추가
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
    marginRight: 5,
  },

  checkboxContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center' },
  checkboxText: { marginLeft: 8, fontSize: 14 },
  loginButton: { backgroundColor: 'teal', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  loginButtonDisabled: { backgroundColor: '#a0c4c4' },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  linkContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  linkTextBlue: { color: '#007AFF', fontSize: 14 },
  linkTextGrey: { color: 'grey', fontSize: 14 },
});