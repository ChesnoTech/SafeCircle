import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { login, register, setTokens } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const data = isRegister
        ? await register({ email, password, name })
        : await login(email, password);

      await setTokens(data.token, data.refreshToken);
      setUser(data.user);
      router.replace('/');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>🛡️</Text>
        <Text style={styles.title}>SafeCircle</Text>
        <Text style={styles.subtitle}>Community-powered safety</Text>
      </View>

      <View style={styles.form}>
        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '...' : isRegister ? 'Create Account' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => { setIsRegister(!isRegister); setError(''); }}
        >
          <Text style={styles.switchText}>
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 64 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#DC2626', marginTop: 12 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  form: { gap: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16,
    fontSize: 16, backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#DC2626', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  switchButton: { alignItems: 'center', marginTop: 16 },
  switchText: { color: '#DC2626', fontSize: 14 },
  error: { color: '#DC2626', textAlign: 'center', fontSize: 14 },
});
