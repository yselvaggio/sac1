import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Google OAuth Client IDs - Using Expo's default for development
const GOOGLE_WEB_CLIENT_ID = '275878578780-4vn56qj7jmabvmkofhaj5k0gu8au0hhe.apps.googleusercontent.com';

interface User {
  id: string;
  email: string;
  nome: string;
  tipo: string;
  member_id: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nome: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  googleRequest: any;
  googlePromptAsync: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    selectAccount: true,
  });

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      handleGoogleAuth(id_token);
    }
  }, [googleResponse]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        const response = await axios.get(`${BACKEND_URL}/api/auth/verify?token=${storedToken}`);
        setUser(response.data);
        setToken(storedToken);
      }
    } catch (error) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Errore durante il login';
      throw new Error(message);
    }
  };

  const register = async (email: string, password: string, nome: string) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        email,
        password,
        nome
      });
      
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Errore durante la registrazione';
      throw new Error(message);
    }
  };

  const handleGoogleAuth = async (idToken: string) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/google`, {
        id_token: idToken
      });
      
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Errore con Google';
      throw new Error(message);
    }
  };

  const loginWithGoogle = async () => {
    if (googlePromptAsync) {
      await googlePromptAsync();
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      login, 
      register, 
      loginWithGoogle,
      logout,
      googleRequest,
      googlePromptAsync 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
