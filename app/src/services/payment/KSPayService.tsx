import React, { useRef, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, ActivityIndicator, Alert, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface KSPayProps {
  isVisible: boolean;
  onClose: (success: boolean) => void;
  paymentData: any;
}

export default function KSPayService({ isVisible, onClose, paymentData }: KSPayProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(false);
  const [isPayStarted, setIsPayStarted] = useState(false);

  // 1. 최종 승인 및 DB 저장 (kspay_service.dart 로직 이식)
  const approvePayment = async (payKey: string) => {
    try {
      setLoading(true);
      const response = await fetch("https://pgdev.ksnet.co.kr/store/KSPayMobileV1.4/web_host/recv_jpost.jsp", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `sndCommConId=${payKey}&sndAmount=${paymentData.amount}&sndActionType=1&sndCharSet=UTF-8`
      });

      if (response.ok) {
        // 이용권 만료일 계산 (보통 30일)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (paymentData.durationInDays || 30));

        // Supabase user_packages 테이블에 인서트
        const { error } = await supabase.from('user_packages').insert([{
          user_id: paymentData.userId,
          package_id: paymentData.packageId,
          package_name: paymentData.packageName,
          total_sessions: paymentData.totalSessions,
          remaining_sessions: paymentData.totalSessions,
          expiry_date: expiryDate.toISOString(),
          branch_id: paymentData.branchId,
          child_id: paymentData.childId,
          child_name: paymentData.childName,
          price: paymentData.amount,
          status: 'active'
        }]);

        if (error) throw error;
        onClose(true); // 성공 핸들러 실행
      } else {
        throw new Error("결제 승인 서버 응답 오류");
      }
    } catch (e: any) {
      Alert.alert("승인 오류", e.message);
      onClose(false);
    } finally {
      setLoading(false);
    }
  };

  // 2. 외부 스키마 처리 (카드사 앱 호출 등)
  const handleShouldStartLoad = (request: any) => {
    const { url } = request;
    if (!url.startsWith('http') && !url.startsWith('about:blank')) {
      Linking.openURL(url).catch(() => Alert.alert("알림", "카드사 앱을 실행할 수 없습니다."));
      return false;
    }
    return true;
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onClose(false)}>
            <Ionicons name="close" size={28} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카드 결제</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* 웹뷰 영역 */}
        <WebView
          ref={webViewRef}
          source={{ uri: "https://pgdev.ksnet.co.kr/store/KSPayMobileV1.4/mall/app/sapp.jsp" }}
          onMessage={(event) => {
            const res = JSON.parse(event.nativeEvent.data);
            if (res.successYn === 'Y' && res.payKey) {
              approvePayment(res.payKey);
            } else {
              onClose(false);
            }
          }}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          onLoadEnd={() => {
            if (!isPayStarted) {
              const jsCode = `
                window.kspayCallback = function(data) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(data));
                };
                if (typeof requestPay === 'function') {
                  requestPay({
                    callbackfunction: 'window.kspayCallback',
                    mid: '2999199999',
                    paymethod: 'card',
                    ordernumb: 'ORD_${Date.now()}',
                    productname: '${paymentData.packageName}',
                    username: '${paymentData.userName}',
                    userphonenumb: '${paymentData.userPhone}',
                    payamount: ${paymentData.amount}
                  });
                }
              `;
              webViewRef.current?.injectJavaScript(jsCode);
              setIsPayStarted(true);
            }
          }}
        />
        
        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={{marginTop: 10, fontWeight: 'bold'}}>결제 처리 중...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }
});