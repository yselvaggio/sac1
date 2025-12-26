import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SHADOWS } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PartnerOffer {
  id: string;
  titolo: string;
  descrizione: string;
  azienda: string;
  sconto?: string;
  email_contatto?: string;
  telefono_contatto?: string;
  indirizzo?: string;
  created_at: string;
}

export default function NewsScreen() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<PartnerOffer | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/partner-offers`);
      setOffers(response.data);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchOffers();
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleSendMessage = async () => {
    if (!contactMessage.trim()) {
      Alert.alert('Errore', 'Scrivi un messaggio');
      return;
    }

    setIsSending(true);
    try {
      await axios.post(`${BACKEND_URL}/api/partner-offers/${selectedOffer?.id}/contact`, {
        offer_id: selectedOffer?.id,
        sender_name: user?.nome,
        sender_email: user?.email,
        message: contactMessage.trim()
      });
      
      Alert.alert('Successo', 'Messaggio inviato al partner!');
      setContactMessage('');
      setShowContactModal(false);
    } catch (error) {
      Alert.alert('Errore', 'Impossibile inviare il messaggio');
    } finally {
      setIsSending(false);
    }
  };

  const renderOffer = ({ item }: { item: PartnerOffer }) => (
    <TouchableOpacity 
      style={styles.offerCard}
      onPress={() => setSelectedOffer(item)}
      activeOpacity={0.8}
    >
      <View style={styles.offerHeader}>
        <View style={styles.companyBadge}>
          <Ionicons name="business" size={20} color={COLORS.accent} />
        </View>
        <View style={styles.offerHeaderText}>
          <Text style={styles.companyName}>{item.azienda}</Text>
          {item.sconto && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.sconto}</Text>
            </View>
          )}
        </View>
      </View>
      
      <Text style={styles.offerTitle}>{item.titolo}</Text>
      <Text style={styles.offerDescription} numberOfLines={2}>{item.descrizione}</Text>
      
      <View style={styles.offerFooter}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.offerDate}>
            {new Date(item.created_at).toLocaleDateString('it-IT')}
          </Text>
        </View>
        <View style={styles.viewMore}>
          <Text style={styles.viewMoreText}>Vedi dettagli</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="gift-outline" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>Nessuna offerta disponibile</Text>
      <Text style={styles.emptyText}>
        Le offerte dei nostri partner appariranno qui. Torna presto!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offerte Partner</Text>
        <Text style={styles.headerSubtitle}>
          Sconti esclusivi per i membri del club
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          renderItem={renderOffer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        />
      )}

      {/* Offer Detail Modal */}
      <Modal
        visible={!!selectedOffer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedOffer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedOffer?.azienda}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedOffer(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Discount Badge */}
              {selectedOffer?.sconto && (
                <View style={styles.modalDiscountBadge}>
                  <Ionicons name="pricetag" size={20} color="#FFF" />
                  <Text style={styles.modalDiscountText}>{selectedOffer.sconto}</Text>
                </View>
              )}

              {/* Offer Details */}
              <Text style={styles.modalOfferTitle}>{selectedOffer?.titolo}</Text>
              <Text style={styles.modalDescription}>{selectedOffer?.descrizione}</Text>

              {/* Contact Section */}
              <View style={styles.contactSection}>
                <Text style={styles.contactSectionTitle}>
                  <Ionicons name="call" size={18} color={COLORS.accent} /> CONTATTACI
                </Text>

                {selectedOffer?.telefono_contatto && (
                  <TouchableOpacity 
                    style={styles.contactRow}
                    onPress={() => handleCall(selectedOffer.telefono_contatto!)}
                  >
                    <View style={styles.contactIcon}>
                      <Ionicons name="call" size={20} color={COLORS.success} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Telefono</Text>
                      <Text style={styles.contactValue}>{selectedOffer.telefono_contatto}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}

                {selectedOffer?.email_contatto && (
                  <TouchableOpacity 
                    style={styles.contactRow}
                    onPress={() => handleEmail(selectedOffer.email_contatto!)}
                  >
                    <View style={styles.contactIcon}>
                      <Ionicons name="mail" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue}>{selectedOffer.email_contatto}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}

                {selectedOffer?.indirizzo && (
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="location" size={20} color={COLORS.accent} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Indirizzo</Text>
                      <Text style={styles.contactValue}>{selectedOffer.indirizzo}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Send Message Button */}
              <TouchableOpacity 
                style={styles.messageButton}
                onPress={() => setShowContactModal(true)}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.background} />
                <Text style={styles.messageButtonText}>Invia Messaggio</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contact Message Modal */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.contactModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invia Messaggio</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.contactModalSubtitle}>
              A: {selectedOffer?.azienda}
            </Text>

            <TextInput
              style={styles.messageInput}
              placeholder="Scrivi il tuo messaggio..."
              placeholderTextColor={COLORS.textMuted}
              value={contactMessage}
              onChangeText={setContactMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={COLORS.background} />
                  <Text style={styles.sendButtonText}>INVIA</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offerHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  discountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 12,
    color: COLORS.accent,
    marginRight: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
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
  modalDiscountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  modalDiscountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  modalOfferTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  contactSection: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  contactSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  contactValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.background,
    marginLeft: 8,
  },
  // Contact Modal
  contactModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  contactModalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  messageInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    minHeight: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.background,
    marginLeft: 8,
  },
});
