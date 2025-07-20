import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerWithEmail } from '../database/auth';
import { useLanguage } from '../utils/LanguageProvider';
import translations from '../utils/locales.js';

export default function RegisterScreen({ goToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const { lang, setLang } = useLanguage();
  const t = translations[lang];

  // Validar contraseña en tiempo real
  const validatePassword = (pass: string) => {
    if (pass.length < 6) {
      setPasswordError(t.passwordShort);
      return false;
    }
    if (!/[A-Z]/.test(pass)) {
      setPasswordError(t.passwordUpper);
      return false;
    }
    if (!/[a-z]/.test(pass)) {
      setPasswordError(t.passwordLower);
      return false;
    }
    if (!/[0-9]/.test(pass)) {
      setPasswordError(t.passwordNumber);
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Validar confirmación de contraseña
  const validateConfirmPassword = (confirmPass: string) => {
    if (!confirmPass) {
      setConfirmPasswordError('');
      return false;
    }
    if (confirmPass !== password) {
      setConfirmPasswordError(t.passwordMismatch);
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    validatePassword(text);
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    validateConfirmPassword(text);
  };

  const handleRegister = async () => {
    // Validar campos vacíos
    if (!email || !password || !confirmPassword) {
      Alert.alert(t.error, t.required);
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t.error, t.invalidEmail);
      return;
    }

    // Validar contraseña
    if (!validatePassword(password)) {
      Alert.alert(t.error, passwordError);
      return;
    }

    // Validar confirmación
    if (!validateConfirmPassword(confirmPassword)) {
      Alert.alert(t.error, confirmPasswordError);
      return;
    }

    try {
      await registerWithEmail(email, password);
      Alert.alert(t.success, t.success, [
        {
          text: 'OK',
          onPress: goToLogin
        }
      ]);
    } catch (error) {
      let msg = t.error;
      if (error.code === 'auth/email-already-in-use') {
        msg = lang === 'es'
          ? 'El correo ya está registrado. Intenta con otro correo o inicia sesión.'
          : 'Email already registered. Try another or log in.';
      } else if (error.code === 'auth/invalid-email') {
        msg = t.invalidEmail;
      } else if (error.code === 'auth/weak-password') {
        msg = lang === 'es'
          ? 'La contraseña es muy débil. Usa una contraseña más segura.'
          : 'Password is too weak. Use a stronger password.';
      } else if (error.code === 'auth/network-request-failed') {
        msg = lang === 'es'
          ? 'Error de conexión. Verifica tu internet e intenta de nuevo.'
          : 'Network error. Check your internet and try again.';
      }
      Alert.alert(t.error, msg);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Selector de idioma */}
        <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#181818', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1, borderColor: '#00e676' }}
            onPress={() => setLang(lang === 'es' ? 'en' : 'es')}
          >
            <Text style={{ color: '#00e676', fontWeight: 'bold' }}>{lang === 'es' ? 'ENGLISH' : 'ESPAÑOL'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.header}>
          <Ionicons name="person-add" size={60} color="#00e676" />
          <Text style={styles.title}>{t.registerTitle}</Text>
          <Text style={styles.subtitle}>{t.join}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.email}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t.emailPlaceholder}
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.password}</Text>
            <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
              <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={handlePasswordChange}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.confirmPassword}</Text>
            <View style={[styles.inputContainer, confirmPasswordError ? styles.inputError : null]}>
              <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                placeholder={t.confirmPasswordPlaceholder}
                placeholderTextColor="#666"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}
          </View>

          <TouchableOpacity 
            style={[
              styles.registerButton, 
              (!email || !password || !confirmPassword || !!passwordError || !!confirmPasswordError) 
                ? styles.registerButtonDisabled 
                : null
            ]} 
            onPress={handleRegister}
            disabled={!email || !password || !confirmPassword || !!passwordError || !!confirmPasswordError}
          >
            <Text style={styles.registerButtonText}>{t.createAccount}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t.or}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={goToLogin}
          >
            <Text style={styles.loginText}>{t.alreadyAccount}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    marginTop: 30,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#181818',
  },
  inputError: {
    borderColor: '#e53935',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  eyeButton: {
    padding: 5,
  },
  errorText: {
    color: '#e53935',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  registerButton: {
    backgroundColor: '#00e676',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#00e676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  registerButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    marginHorizontal: 15,
    fontWeight: 'bold',
    color: '#666',
  },
  loginButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00e676',
  },
}); 