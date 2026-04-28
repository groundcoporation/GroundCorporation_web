import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🚀 인증 관련 화면들을 login 폴더에서 한꺼번에 불러옵니다.
import LoginScreen from './src/screens/login/LoginScreen';
import SignUpScreen from './src/screens/login/SignUpScreen';
import FindAuthScreen from './src/screens/login/FindAuthScreen';
import HomeScreen from './src/screens/home/HomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Home'>('Login');

  useEffect(() => {
    async function initializeAuth() {
      try {
        // 자동 로그인 여부 확인
        const autoLoginEnabled = await AsyncStorage.getItem('auto_login');
        if (autoLoginEnabled === 'true') {
          setInitialRoute('Home');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error("인증 초기화 중 에러:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initializeAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="teal" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right' // 화면 전환 시 부드러운 애니메이션
        }}
      >
        {/* 로그인 폴더 내 화면들 */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="FindAuth" component={FindAuthScreen} />

        {/* 홈 화면 */}
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});