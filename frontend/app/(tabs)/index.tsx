import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SHADOWS } from '../../src/constants/theme';
import QRCode from 'react-native-qrcode-svg';

export default function HomeScreen() {
  const { user } = useAuth();

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

        {/* Digital Member Card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={[COLORS.primary, '#3D0000', COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.memberCard}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardLogo}>
                <Ionicons name="shield-checkmark" size={28} color={COLORS.accent} />
              </View>
              <View>
                <Text style={styles.cardBrand}>SOLUCION ALBANIA</Text>
                <Text style={styles.cardSubtitle}>CLUB ESCLUSIVO</Text>
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.cardBody}>
              <Text style={styles.memberName}>{user?.nome?.toUpperCase() || 'MEMBRO'}</Text>
              <Text style={styles.memberLabel}>MEMBRO</Text>
            </View>

            {/* Card Footer */}
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.memberId}>ID: {user?.member_id || '#000000'}</Text>
                <Text style={styles.memberSince}>Membro dal 2025</Text>
              </View>
              <View style={styles.qrContainer}>
                <QRCode
                  value={user?.id || 'solucion-albania-club'}
                  size={60}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            </View>
          </LinearGradient>
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

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Come usare la tessera</Text>
            <Text style={styles.infoText}>
              Mostra il QR Code ai nostri partner per ricevere sconti esclusivi. La tessera è valida in tutti i punti convenzionati.
            </Text>
          </View>
        </View>
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
  memberCard: {
    borderRadius: 20,
    padding: 24,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  cardBody: {
    marginBottom: 24,
  },
  memberName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  memberLabel: {
    fontSize: 12,
    color: COLORS.accent,
    letterSpacing: 3,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  memberId: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  memberSince: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 8,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
