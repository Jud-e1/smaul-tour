import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/auth';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { login, loginOAuth, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      await login(email.trim(), password);
    } catch {
      // error shown via store
    }
  };

  const handleOAuth = async (provider: string) => {
    // In production, use react-native-google-signin or similar
    Alert.alert('OAuth', `${provider} OAuth would open here`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChangeText={(t) => { setEmail(t); clearError(); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); clearError(); }}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={styles.forgotLink}
          onPress={() => navigation.navigate('ResetPassword')}
        >
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.oauthBtn} onPress={() => handleOAuth('Google')}>
          <Text style={styles.oauthBtnText}>Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.oauthBtn} onPress={() => handleOAuth('Facebook')}>
          <Text style={styles.oauthBtnText}>Continue with Facebook</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
          <Text style={styles.registerText}>
            Don&apos;t have an account? <Text style={styles.linkText}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#DC2626', fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14,
    fontSize: 16, marginBottom: 12, backgroundColor: '#F9FAFB',
  },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 20 },
  linkText: { color: '#2563EB', fontSize: 14, fontWeight: '500' },
  primaryBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 14 },
  oauthBtn: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 12, backgroundColor: '#fff',
  },
  oauthBtnText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  registerLink: { marginTop: 16, alignItems: 'center' },
  registerText: { fontSize: 14, color: '#6B7280' },
});
