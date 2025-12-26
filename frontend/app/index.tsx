import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SHADOWS } from '../src/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Google OAuth Client IDs (you need to create these in Google Cloud Console)
const GOOGLE_WEB_CLIENT_ID = ''; // Leave empty - will use expo proxy
const GOOGLE_IOS_CLIENT_ID = '';
const GOOGLE_ANDROID_CLIENT_ID = '';

export default function AuthScreen() {
  const { user, isLoading, login, register, loginWithGoogle } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Password Reset Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Google Auth Setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  });

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === 'success') {
      setIsGoogleLoading(true);
      try {
        const { authentication } = response;
        if (authentication?.accessToken) {
          // Get user info from Google
          const userInfoResponse = await fetch(
            'https://www.googleapis.com/userinfo/v2/me',
            {
              headers: { Authorization: `Bearer ${authentication.accessToken}` },
            }
          );
          const userInfo = await userInfoResponse.json();
          
          // Login or register with our backend
          await loginWithGoogle(
            userInfo.email,
            userInfo.name || userInfo.email.split('@')[0],
            userInfo.id,
            userInfo.picture
          );
        }
      } catch (error: any) {
        console.error('Google auth error:', error);
        Alert.alert('Errore', error.message || 'Errore durante il login con Google');
      } finally {
        setIsGoogleLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      await promptAsync();
    } catch (error) {
      console.error('Google prompt error:', error);
      Alert.alert('Errore', 'Impossibile avviare il login con Google');
      setIsGoogleLoading(false);
    }
  };

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

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Errore', 'Inserisci la tua email');
      return;
    }

    setIsResetting(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/reset-password`, {
        email: resetEmail.toLowerCase().trim()
      });

      const data = response.data;
      
      if (data.email_sent) {
        Alert.alert(
          'Email Inviata',
          'Abbiamo inviato una nuova password alla tua email. Controlla la tua casella di posta.',
          [{ text: 'OK', onPress: () => setShowResetModal(false) }]
        );
      } else if (data.temp_password) {
        // Email not configured - show password directly
        Alert.alert(
          'Nuova Password',
          `La tua nuova password temporanea e:\n\n${data.temp_password}\n\nAnnotala e usala per accedere.`,
          [{ text: 'OK', onPress: () => setShowResetModal(false) }]
        );
      }
      
      setResetEmail('');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Errore durante il recupero password';
      Alert.alert('Errore', message);
    } finally {
      setIsResetting(false);
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

            {/* Forgot Password Link - Only in Login Mode */}
            {isLoginMode && (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => setShowResetModal(true)}
              >
                <Text style={styles.forgotText}>Hai dimenticato la password?</Text>
              </TouchableOpacity>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && { opacity: 0.7 }
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
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
            </Pressable>

            {/* Google Login Button */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>oppure</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading || !request}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIcon}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>
                    Continua con Google
                  </Text>
                </>
              )}
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

      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResetModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recupera Password</Text>
              <TouchableOpacity
                onPress={() => setShowResetModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Inserisci la tua email e ti invieremo una nuova password temporanea.
            </Text>

            <View style={styles.modalInputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                placeholderTextColor={COLORS.textMuted}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handlePasswordReset}
              disabled={isResetting}
            >
              {isResetting ? (
                <ActivityIndicator color={COLORS.accent} />
              ) : (
                <Text style={styles.modalButtonText}>INVIA NUOVA PASSWORD</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
  },
  forgotText: {
    color: COLORS.accent,
    fontSize: 14,
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
  // Google Button Styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  modalDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
