import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  TouchableWithoutFeedback, Keyboard
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { Input, Button } from '../components/UI'
import { COLORS } from '../theme'
import { Ionicons } from '@expo/vector-icons'
import icon from '../../assets/icon.png'

export default function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    Keyboard.dismiss()
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password')
      return
    }
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.primary }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <icon style={styles.logoEmoji} />
            </View>
            <Text style={styles.appName}>TMS</Text>
            <Text style={styles.appSub}>Trading Management System</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign In</Text>

            <Input
              label="Username"
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordWrap}>
              <Input
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                style={{ flex: 1, marginBottom: 0 }}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPw(!showPw)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            <Button
              title={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              style={{ marginTop: 16 }}
            />
          </View>

          <Text style={styles.footer}>WoodTrack v1.0 • Secure Platform</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  logoSection: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff' },
  appSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 12, top: 10 },
  footer: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 24 },
})