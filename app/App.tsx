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
import KSPayService from "./src/services/payment/KSPayService"; 
import MyPackageScreen from "./src/screens/pass/MyPackageScreen"; 

// 📅 [예약 관련 시스템]
import ReservationScreen from "./src/screens/reservation/ReservationScreen"; 
import ReservationSuccessScreen from "./src/screens/reservation/ReservationSuccessScreen";
import ReservationFailScreen from "./src/screens/reservation/ReservationFailScreen";

// 👤 [마이페이지 관련]
import MyPageScreen from "./src/screens/mypage/MyPageScreen"; 
import ProfileEditScreen from "./src/screens/mypage/ProfileEditScreen"; 
import ChildManagementScreen from "./src/screens/mypage/ChildManagementScreen"; 

// 📢 [공지사항 관련]
import NoticeListScreen from "./src/screens/notice/NoticeListScreen";
import NoticeDetailScreen from "./src/screens/notice/NoticeDetailScreen";
import NoticeEditScreen from "./src/screens/notice/NoticeEditScreen";

// 🚌 [출석 및 등하원(픽업) 관련] 
import AttendanceScreen from "./src/screens/attendance/AttendanceScreen";
import PickupMainScreen from "./src/screens/pickup/PickupMainScreen"; // 👈 추가된 픽업 메인
import PickupApplyScreen from "./src/screens/pickup/PickupApplyScreen"; // 👈 추가된 픽업 신청/수정
import RealtimeMapScreen from "./src/screens/pickup/RealtimeMapScreen"; // 👈 추가된 실시간 지도

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
        <Stack.Screen name="MyPackage" component={MyPackageScreen} />
        
        {/* <Stack.Screen 
          name="KSPay" 
          component={KSPayService} 
          options={{ 
            animation: "slide_from_bottom", 
            presentation: "modal" 
          }} 
        /> */}
        
        {/* 3. 예약 프로세스 */}
        <Stack.Screen name="Reservation" component={ReservationScreen} /> 
        <Stack.Screen name="ReservationSuccess" component={ReservationSuccessScreen} />
        <Stack.Screen name="ReservationFail" component={ReservationFailScreen} /> 

        {/* 4. 마이페이지 프로세스 */}
        <Stack.Screen name="MyPage" component={MyPageScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
        <Stack.Screen name="ChildManagement" component={ChildManagementScreen} />

        {/* 5. 공지사항 프로세스 */}
        <Stack.Screen name="NoticeList" component={NoticeListScreen} />
        <Stack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
        <Stack.Screen name="NoticeEdit" component={NoticeEditScreen} />

        {/* 6. 출석 프로세스 */}
        <Stack.Screen name="Attendance" component={AttendanceScreen} />

        {/* 7. 픽업(유료셔틀) 프로세스 👈 새로 추가된 부분! */}
        <Stack.Screen name="PickupMain" component={PickupMainScreen} />
        <Stack.Screen name="PickupApply" component={PickupApplyScreen} />
        <Stack.Screen name="RealtimeMap" component={RealtimeMapScreen} />

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