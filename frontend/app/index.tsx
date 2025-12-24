import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function AuthScreen() {
  const { user, isLoading, login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci la tua email');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Errore', 'La password deve avere almeno 6 caratteri');
      return;
    }

    if (!isLoginMode) {
      if (!nome.trim()) {
        Alert.alert('Errore', 'Inserisci il tuo nome');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Errore', 'Le password non coincidono');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isLoginMode) {
        await login(email.toLowerCase().trim(), password);
      } else {
        await register(email.toLowerCase().trim(), password, nome.trim());
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Si e verificato un errore. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setPassword('');
    setConfirmPassword('');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isLoginMode ? 'ACCEDI' : 'REGISTRATI'}
            </Text>

            {!isLoginMode && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Nome e Cognome"
                  placeholderTextColor={COLORS.textMuted}
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            {!isLoginMode && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Conferma Password"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.buttonGradient}>
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.accent} />
                ) : (
                  <Text style={styles.buttonText}>
                    {isLoginMode ? 'ACCEDI' : 'REGISTRATI'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={switchMode}
            >
              <Text style={styles.switchText}>
                {isLoginMode
                  ? "Non hai un account? Registrati"
                  : 'Hai gia un account? Accedi'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Sconti esclusivi - Partner selezionati</Text>
            <Text style={styles.footerText}>Community italiana in Albania</Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 180,
    height: 160,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  buttonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
});
