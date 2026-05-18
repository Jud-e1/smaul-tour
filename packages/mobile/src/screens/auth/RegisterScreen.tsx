import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/auth';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'traveler' | 'guide'>('traveler');

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    try {
      await register({ email: email.trim(), password, role, firstName: firstName.trim(), lastName: lastName.trim() });
    } catch {
      // error shown via store
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join the tourism marketplace</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="First name"
            value={firstName}
            onChangeText={(t) => { setFirstName(t); clearError(); }}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Last name"
            value={lastName}
            onChangeText={(t) => { setLastName(t); clearError(); }}
            autoCapitalize="words"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChangeText={(t) => { setEmail(t); clearError(); }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          value={password}
          onChangeText={(t) => { setPassword(t); clearError(); }}
          secureTextEntry
        />

        {/* Role selector */}
        <Text style={styles.label}>I am a:</Text>
        <View style={styles.roleRow}>
          {(['traveler', 'guide'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.linkText}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8, marginTop: 24 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#DC2626', fontSize: 14 },
  row: { flexDirection: 'row', marginBottom: 0 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14,
    fontSize: 16, marginBottom: 12, backgroundColor: '#F9FAFB',
  },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: {
    flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  roleBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  roleBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  roleBtnTextActive: { color: '#2563EB' },
  primaryBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginLink: { alignItems: 'center', marginTop: 8 },
  loginText: { fontSize: 14, color: '#6B7280' },
  linkText: { color: '#2563EB', fontWeight: '500' },
});
