import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SHADOWS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Esci',
      'Sei sicuro di voler uscire dal tuo account?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Il Mio Profilo</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nome?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.nome || 'Membro'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.memberBadge}>
            <Ionicons name="star" size={14} color={COLORS.accent} />
            <Text style={styles.memberBadgeText}>Membro Club</Text>
          </View>
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>La Tua Tessera Digitale</Text>
          <View style={styles.qrCard}>
            <View style={styles.qrCardInner}>
              <View style={styles.qrHeader}>
                <View style={styles.qrLogo}>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
                </View>
                <View>
                  <Text style={styles.qrBrand}>SOLUCION ALBANIA</Text>
                  <Text style={styles.qrSubtitle}>TESSERA MEMBRO</Text>
                </View>
              </View>
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={`solucion-club:${user?.id || 'member'}`}
                    size={140}
                    backgroundColor="white"
                    color="black"
                  />
                </View>
              </View>
              <View style={styles.qrFooter}>
                <Text style={styles.qrName}>{user?.nome?.toUpperCase()}</Text>
                <Text style={styles.qrId}>ID: {user?.member_id}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.qrHint}>
            Mostra questo QR Code ai partner per ottenere sconti
          </Text>
        </View>

        {/* Account Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informazioni Account</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nome</Text>
                <Text style={styles.infoValue}>{user?.nome}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ID Membro</Text>
                <Text style={styles.infoValue}>{user?.member_id}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="ribbon-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tipo Account</Text>
                <Text style={styles.infoValue}>
                  {user?.tipo === 'partner' ? 'Partner' : 'Membro'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Esci dall'account</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Solucion Albania Club v1.0.0</Text>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.card,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 6,
  },
  qrSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  qrCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  qrCardInner: {
    padding: 20,
    backgroundColor: COLORS.primary,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrBrand: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accent,
    letterSpacing: 1,
  },
  qrSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
  },
  qrFooter: {
    alignItems: 'center',
  },
  qrName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  qrId: {
    fontSize: 12,
    color: COLORS.accent,
  },
  qrHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: 8,
  },
  version: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
