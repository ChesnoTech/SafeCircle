import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { verifyEmail, resendVerificationCode } from '../lib/api';
import { CONFIG } from '../lib/config';
import { t } from '../lib/i18n';

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  // Auto-submit when all digits entered
  useEffect(() => {
    if (code.length === CODE_LENGTH && !loading) {
      handleVerify(code);
    }
  }, [code]);

  const handleVerify = async (verificationCode) => {
    setError('');
    setLoading(true);
    try {
      await verifyEmail(verificationCode);
      setSuccess(true);
      // Brief pause to show success, then navigate
      setTimeout(() => router.replace('/'), 1500);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('expired')) {
        setError(t('verification.codeExpired'));
      } else {
        setError(t('verification.invalidCode'));
      }
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      await resendVerificationCode();
      Alert.alert(t('verification.verifyEmail'), t('verification.codeSent'));
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (text) => {
    // Only allow digits, limit to CODE_LENGTH
    const digits = text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.successIcon}>{'✓'}</Text>
        <Text style={styles.successText}>{t('verification.verified')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('verification.verifyEmail')}</Text>
      <Text style={styles.subtitle}>{t('verification.codeSent')}</Text>

      {/* Code display boxes */}
      <TouchableOpacity
        style={styles.codeContainer}
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
      >
        {Array.from({ length: CODE_LENGTH }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.codeBox,
              index < code.length && styles.codeBoxFilled,
              index === code.length && styles.codeBoxActive,
            ]}
          >
            <Text style={styles.codeDigit}>
              {code[index] || ''}
            </Text>
          </View>
        ))}
      </TouchableOpacity>

      {/* Hidden input for keyboard */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={code}
        onChangeText={handleCodeChange}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && (
        <ActivityIndicator
          size="large"
          color={CONFIG.COLORS.primary}
          style={styles.loader}
        />
      )}

      <TouchableOpacity
        style={[styles.resendButton, resending && styles.buttonDisabled]}
        onPress={handleResend}
        disabled={resending || loading}
      >
        {resending ? (
          <ActivityIndicator color={CONFIG.COLORS.primary} />
        ) : (
          <Text style={styles.resendText}>{t('verification.resendCode')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: CONFIG.COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: CONFIG.COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CONFIG.COLORS.border,
    backgroundColor: CONFIG.COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxFilled: {
    borderColor: CONFIG.COLORS.primary,
  },
  codeBoxActive: {
    borderColor: CONFIG.COLORS.primary,
    borderWidth: 2,
  },
  codeDigit: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CONFIG.COLORS.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  error: {
    color: CONFIG.COLORS.error,
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  loader: {
    marginBottom: 16,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    color: CONFIG.COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  successIcon: {
    fontSize: 64,
    color: CONFIG.COLORS.success,
    marginBottom: 16,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CONFIG.COLORS.success,
  },
});
