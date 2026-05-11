import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FindAuthScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="black" />
      </TouchableOpacity>
      <Text style={styles.text}>아이디/비밀번호 찾기 화면 준비 중</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  backButton: { marginBottom: 20 },
  text: { fontSize: 18, textAlign: 'center', marginTop: 100 }
});