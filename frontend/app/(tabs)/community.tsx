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
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SHADOWS } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CommunityPost {
  id: string;
  autore_id: string;
  autore_nome: string;
  titolo: string;
  corpo: string;
  email?: string;
  telefono?: string;
  citta?: string;
  created_at: string;
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newCitta, setNewCitta] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/community-posts`);
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPosts();
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi');
      return;
    }

    if (!newNome.trim()) {
      Alert.alert('Errore', 'Inserisci il tuo nome');
      return;
    }

    if (!newEmail.trim()) {
      Alert.alert('Errore', 'Inserisci la tua email');
      return;
    }

    if (!newTelefono.trim()) {
      Alert.alert('Errore', 'Inserisci il tuo telefono');
      return;
    }

    if (!newCitta.trim()) {
      Alert.alert('Errore', 'Inserisci la tua città');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${BACKEND_URL}/api/community-posts`, {
        autore_id: user?.id,
        autore_nome: newNome.trim(),
        titolo: newTitle.trim(),
        corpo: newBody.trim(),
        email: newEmail.trim(),
        telefono: newTelefono.trim(),
        citta: newCitta.trim(),
      });
      setNewTitle('');
      setNewBody('');
      setNewNome('');
      setNewEmail('');
      setNewTelefono('');
      setNewCitta('');
      setIsModalVisible(false);
      fetchPosts();
      Alert.alert('Successo', 'Annuncio pubblicato!');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile pubblicare l\'annuncio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const renderPost = ({ item }: { item: CommunityPost }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.authorAvatar}>
          <Text style={styles.avatarText}>
            {item.autore_nome?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.postHeaderText}>
          <Text style={styles.authorName}>{item.autore_nome}</Text>
          <Text style={styles.postDate}>
            {new Date(item.created_at).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>
      
      <Text style={styles.postTitle}>{item.titolo}</Text>
      <Text style={styles.postBody}>{item.corpo}</Text>

      {/* Contact Details Section */}
      {(item.email || item.telefono || item.citta) && (
        <View style={styles.contactSection}>
          <View style={styles.contactDivider} />
          <Text style={styles.contactHeader}>Contatta l'inserzionista</Text>
          
          {item.citta && (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.contactText}>{item.citta}</Text>
            </View>
          )}
          
          {item.telefono && (
            <TouchableOpacity 
              style={styles.contactRow}
              onPress={() => handleCall(item.telefono!)}
            >
              <Ionicons name="call-outline" size={16} color={COLORS.accent} />
              <Text style={styles.contactLink}>{item.telefono}</Text>
            </TouchableOpacity>
          )}
          
          {item.email && (
            <TouchableOpacity 
              style={styles.contactRow}
              onPress={() => handleEmail(item.email!)}
            >
              <Ionicons name="mail-outline" size={16} color={COLORS.accent} />
              <Text style={styles.contactLink}>{item.email}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>Nessun annuncio</Text>
      <Text style={styles.emptyText}>
        Sii il primo a pubblicare un annuncio nella bacheca del club!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bacheca Community</Text>
          <Text style={styles.headerSubtitle}>
            Annunci dalla community italiana
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
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

      {/* Create Post Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nuovo Annuncio</Text>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Titolo *</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Titolo annuncio"
                placeholderTextColor={COLORS.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                maxLength={100}
              />

              <Text style={styles.inputLabel}>Contenuto *</Text>
              <TextInput
                style={styles.bodyInput}
                placeholder="Scrivi il tuo annuncio..."
                placeholderTextColor={COLORS.textMuted}
                value={newBody}
                onChangeText={setNewBody}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={1000}
              />

              <Text style={styles.sectionLabel}>Informazioni di Contatto</Text>

              <Text style={styles.inputLabel}>Nome *</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="Il tuo nome"
                placeholderTextColor={COLORS.textMuted}
                value={newNome}
                onChangeText={setNewNome}
                maxLength={100}
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="La tua email"
                placeholderTextColor={COLORS.textMuted}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />

              <Text style={styles.inputLabel}>Telefono *</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="Il tuo numero di telefono"
                placeholderTextColor={COLORS.textMuted}
                value={newTelefono}
                onChangeText={setNewTelefono}
                keyboardType="phone-pad"
                maxLength={20}
              />

              <Text style={styles.inputLabel}>Città *</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="La tua città"
                placeholderTextColor={COLORS.textMuted}
                value={newCitta}
                onChangeText={setNewCitta}
                maxLength={100}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleCreatePost}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <Text style={styles.submitButtonText}>Pubblica</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
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
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  postHeaderText: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  postDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  postBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  titleInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bodyInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 12,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  contactInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.background,
  },
});
