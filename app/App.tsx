import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🚀 [인증 및 홈 화면]
import LoginScreen from "./src/screens/login/LoginScreen";
import SignUpScreen from "./src/screens/login/SignUpScreen";
import FindAuthScreen from "./src/screens/login/FindAuthScreen";
import HomeScreen from "./src/screens/home/HomeScreen";

// 💳 [이용권 및 결제 관련]
import PassPurchaseScreen from "./src/screens/pass/PassPurchaseScreen"; 
import KSPayService from "./src/services/payment/KSPayService"; // 👈 결제 화면 추가

// 📅 [예약 관련 시스템]
import ReservationScreen from "./src/screens/reservation/ReservationScreen"; 
import ReservationSuccessScreen from "./src/screens/reservation/ReservationSuccessScreen";
import ReservationFailScreen from "./src/screens/reservation/ReservationFailScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<"Login" | "Home">("Login");

  useEffect(() => {
    async function initializeAuth() {
      try {
        const autoLoginEnabled = await AsyncStorage.getItem("auto_login");
        setInitialRoute(autoLoginEnabled === "true" ? "Home" : "Login");
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
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        {/* 1. 인증 및 메인 */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="FindAuth" component={FindAuthScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        
        {/* 2. 이용권 및 결제 프로세스 */}
        <Stack.Screen name="Pass" component={PassPurchaseScreen} />
        {/* <Stack.Screen 
          name="KSPay" 
          component={KSPayService} 
          options={{ 
            animation: "slide_from_bottom", // 결제창은 아래에서 위로 올라오는 느낌이 자연스럽습니다.
            presentation: "modal" // iOS에서 모달 스타일로 연출
          }} 
        /> */}
        
        {/* 3. 예약 프로세스 */}
        <Stack.Screen name="Reservation" component={ReservationScreen} /> 
        <Stack.Screen name="ReservationSuccess" component={ReservationSuccessScreen} />
        <Stack.Screen name="ReservationFail" component={ReservationFailScreen} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#ffffff" 
  },
});