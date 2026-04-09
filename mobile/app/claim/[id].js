import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { claimFoundItem, submitVerification } from '../../lib/api';
import { CONFIG } from '../../lib/config';
import { t } from '../../lib/i18n';

export default function ClaimScreen() {
  const { id, itemType = 'found_item' } = useLocalSearchParams();
  const router = useRouter();

  const [step, setStep] = useState('start'); // start | questions | result
  const [claimId, setClaimId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  // Step 1: Start claim and get questions
  const claimMutation = useMutation({
    mutationFn: () => claimFoundItem(id, itemType),
    onSuccess: (data) => {
      setClaimId(data.claimId);
      setQuestions(data.questions);
      const initialAnswers = {};
      data.questions.forEach((q) => { initialAnswers[q.id] = ''; });
      setAnswers(initialAnswers);
      setStep('questions');
    },
    onError: (err) => {
      Alert.alert(t('common.error'), err.message);
    },
  });

  // Step 2: Submit answers
  const verifyMutation = useMutation({
    mutationFn: () => {
      const formattedAnswers = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));
      return submitVerification(claimId, formattedAnswers);
    },
    onSuccess: (data) => {
      setResult(data);
      setStep('result');
    },
    onError: (err) => {
      Alert.alert(t('common.error'), err.message);
    },
  });

  const allAnswered = questions.every((q) => (answers[q.id] || '').trim().length > 0);

  // Start screen
  if (step === 'start') {
    return (
      <View style={styles.container}>
        <View style={styles.startCard}>
          <Text style={styles.startIcon}>{'\uD83D\uDD0D'}</Text>
          <Text style={styles.startTitle}>{t('claim.verifyOwnership')}</Text>
          <Text style={styles.startDesc}>{t('claim.verifyDesc')}</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => claimMutation.mutate()}
            disabled={claimMutation.isPending}
          >
            {claimMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startButtonText}>{t('claim.startVerification')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Questions screen
  if (step === 'questions') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            {t('claim.answerQuestions', { count: questions.length })}
          </Text>
        </View>

        {questions.map((q, i) => (
          <View key={q.id} style={styles.questionCard}>
            <Text style={styles.questionNumber}>{t('claim.question', { num: i + 1 })}</Text>
            <Text style={styles.questionText}>{q.question}</Text>
            <TextInput
              style={styles.answerInput}
              placeholder={t('claim.yourAnswer')}
              value={answers[q.id]}
              onChangeText={(text) => setAnswers((prev) => ({ ...prev, [q.id]: text }))}
              autoCapitalize="none"
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, !allAnswered && styles.submitDisabled]}
          onPress={() => verifyMutation.mutate()}
          disabled={!allAnswered || verifyMutation.isPending}
        >
          {verifyMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{t('claim.submitAnswers')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // Result screen
  return (
    <View style={styles.container}>
      <View style={styles.resultCard}>
        <Text style={styles.resultIcon}>{result.verified ? '\u2705' : '\u274C'}</Text>
        <Text style={styles.resultTitle}>
          {result.verified ? t('claim.verified') : t('claim.notVerified')}
        </Text>
        <Text style={styles.resultScore}>{result.score}</Text>
        <Text style={styles.resultMessage}>{result.message}</Text>
        <TouchableOpacity
          style={[styles.resultButton, result.verified && styles.successButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.resultButtonText}>{t('common.done')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { COLORS } = CONFIG;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Start
  startCard: {
    backgroundColor: COLORS.card, margin: 20, borderRadius: 16, padding: 32,
    alignItems: 'center', elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  startIcon: { fontSize: 64, marginBottom: 16 },
  startTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  startDesc: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: 8, marginBottom: 24, lineHeight: 22,
  },
  startButton: {
    backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 12, minWidth: 200, alignItems: 'center',
  },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Questions
  progressBar: {
    backgroundColor: COLORS.card, padding: 16, marginBottom: 4,
  },
  progressText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  questionCard: {
    backgroundColor: COLORS.card, padding: 16, marginHorizontal: 12,
    marginTop: 8, borderRadius: 12,
  },
  questionNumber: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  questionText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  answerInput: {
    backgroundColor: '#f9f9f9', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: COLORS.primary, padding: 16, borderRadius: 12,
    alignItems: 'center', margin: 16,
  },
  submitDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Result
  resultCard: {
    backgroundColor: COLORS.card, margin: 20, borderRadius: 16, padding: 32,
    alignItems: 'center', elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  resultIcon: { fontSize: 64, marginBottom: 16 },
  resultTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  resultScore: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  resultMessage: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: 8, marginBottom: 24, lineHeight: 22,
  },
  resultButton: {
    backgroundColor: COLORS.textMuted, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 12, minWidth: 200, alignItems: 'center',
  },
  successButton: { backgroundColor: COLORS.success },
  resultButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
