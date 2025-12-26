import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SHADOWS } from '../../src/constants/theme';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface DayNews {
  id: string;
  titolo: string;
  contenuto: string;
  importante: boolean;
  created_at: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const cardRef = useRef<ViewShot>(null);
  const [dayNews, setDayNews] = useState<DayNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const fetchDayNews = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/day-news`);
      setDayNews(response.data);
    } catch (error) {
      console.error('Error fetching day news:', error);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDayNews();
  }, [fetchDayNews]);

  const downloadCard = async () => {
    try {
      if (cardRef.current?.capture) {
        const uri = await cardRef.current.capture();
        
        if (Platform.OS === 'web') {
          // For web - download directly
          const link = document.createElement('a');
          link.href = uri;
          link.download = `tessera-${user?.member_id || 'club'}.png`;
          link.click();
          Alert.alert('Successo', 'Tessera scaricata!');
        } else {
          // For mobile - share
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: 'Salva la tua Tessera Club'
            });
          } else {
            Alert.alert('Errore', 'Condivisione non disponibile su questo dispositivo');
          }
        }
      }
    } catch (error) {
      console.error('Error capturing card:', error);
      Alert.alert('Errore', 'Impossibile scaricare la tessera');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Ciao, {user?.nome || 'Membro'}!</Text>
          <Text style={styles.welcomeText}>Benvenuto nel Club</Text>
        </View>

        {/* Gold Member Card */}
        <View style={styles.cardContainer}>
          <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.goldCard}>
              {/* Gold gradient overlay effect */}
              <View style={styles.goldOverlay} />
              
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.cardLogo}
                  resizeMode="contain"
                />
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>GOLD</Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                <Text style={styles.memberName}>{user?.nome?.toUpperCase() || 'MEMBRO'}</Text>
                <View style={styles.memberTypeContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.memberType}>MEMBRO ESCLUSIVO</Text>
                  <Ionicons name="star" size={14} color="#FFD700" />
                </View>
              </View>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardLabel}>ID MEMBRO</Text>
                  <Text style={styles.cardValue}>{user?.member_id || '#000000'}</Text>
                  <Text style={styles.cardLabel}>VALIDA DAL</Text>
                  <Text style={styles.cardValue}>2025</Text>
                </View>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={`solucion-club:${user?.id || 'member'}`}
                    size={70}
                    backgroundColor="white"
                    color="black"
                  />
                </View>
              </View>

              {/* Card decorative elements */}
              <View style={styles.cardChip}>
                <View style={styles.chipLines}>
                  <View style={styles.chipLine} />
                  <View style={styles.chipLine} />
                  <View style={styles.chipLine} />
                </View>
              </View>
            </View>
          </ViewShot>

          {/* Download Button */}
          <TouchableOpacity style={styles.downloadButton} onPress={downloadCard}>
            <Ionicons name="download-outline" size={20} color={COLORS.accent} />
            <Text style={styles.downloadText}>Scarica Tessera</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Azioni Rapide</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/news')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#8B000020' }]}>
              <Ionicons name="gift" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionTitle}>Offerte Partner</Text>
            <Text style={styles.actionDesc}>Scopri gli sconti</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/community')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFD70020' }]}>
              <Ionicons name="chatbubbles" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.actionTitle}>Bacheca</Text>
            <Text style={styles.actionDesc}>Leggi annunci</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#4CAF5020' }]}>
              <Ionicons name="person" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionTitle}>Profilo</Text>
            <Text style={styles.actionDesc}>I tuoi dati</Text>
          </TouchableOpacity>
        </View>

        {/* Day News Section */}
        <Text style={styles.sectionTitle}>Notizie del Giorno</Text>
        {newsLoading ? (
          <View style={styles.newsLoading}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        ) : dayNews.length > 0 ? (
          <View style={styles.newsContainer}>
            {dayNews.slice(0, 3).map((news) => (
              <View 
                key={news.id} 
                style={[
                  styles.newsCard,
                  news.importante && styles.newsCardImportant
                ]}
              >
                <View style={styles.newsHeader}>
                  {news.importante && (
                    <View style={styles.importantBadge}>
                      <Ionicons name="alert-circle" size={14} color="#fff" />
                      <Text style={styles.importantText}>Importante</Text>
                    </View>
                  )}
                  <Text style={styles.newsDate}>
                    {new Date(news.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <Text style={styles.newsTitle}>{news.titolo}</Text>
                <Text style={styles.newsContent} numberOfLines={3}>
                  {news.contenuto}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noNewsContainer}>
            <Ionicons name="newspaper-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.noNewsText}>Nessuna notizia disponibile</Text>
          </View>
        )}

        {/* End of content */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  cardContainer: {
    marginBottom: 32,
  },
  goldCard: {
    borderRadius: 20,
    padding: 24,
    minHeight: 220,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#FFD700',
    overflow: 'hidden',
    position: 'relative',
  },
  goldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    zIndex: 1,
  },
  cardLogo: {
    width: 100,
    height: 60,
  },
  cardBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  cardBody: {
    marginBottom: 20,
    zIndex: 1,
  },
  memberName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  memberTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberType: {
    fontSize: 11,
    color: '#FFD700',
    letterSpacing: 3,
    opacity: 0.8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 9,
    color: 'rgba(255, 215, 0, 0.6)',
    letterSpacing: 1,
    marginTop: 8,
  },
  cardValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 8,
  },
  cardChip: {
    position: 'absolute',
    right: 80,
    top: 80,
    width: 45,
    height: 35,
    backgroundColor: '#D4AF37',
    borderRadius: 6,
    padding: 4,
    justifyContent: 'center',
  },
  chipLines: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chipLine: {
    height: 3,
    backgroundColor: '#B8860B',
    borderRadius: 1,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  downloadText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  actionDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // Day News Styles
  newsLoading: {
    padding: 40,
    alignItems: 'center',
  },
  newsContainer: {
    marginBottom: 24,
  },
  newsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    ...SHADOWS.small,
  },
  newsCardImportant: {
    borderLeftColor: COLORS.error,
    backgroundColor: 'rgba(139, 0, 0, 0.1)',
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  importantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  importantText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  newsDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  newsContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  noNewsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  noNewsText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
});
