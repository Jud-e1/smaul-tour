import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { tripPlannerApi } from '../lib/api';

interface ExperienceRec {
  experienceId: string;
  suggestedDate?: string;
  reasoning: string;
  experience?: {
    title: string;
    price: { amount: number; currency: string };
    duration: number;
    location: { address: string };
  };
}

interface Itinerary {
  id: string;
  experiences: ExperienceRec[];
  totalCost: { amount: number; currency: string };
  parameters: { duration?: number; preferences: string[] };
  generatedAt: string;
}

export default function TripPlannerScreen() {
  const [input, setInput] = useState('');
  const [modification, setModification] = useState('');
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim()) {
      Alert.alert('Error', 'Please describe your trip');
      return;
    }
    setLoading(true);
    try {
      const { data } = await tripPlannerApi.generate({ naturalLanguageInput: input.trim() });
      setItinerary(data);
    } catch {
      Alert.alert('Error', 'Failed to generate itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModify = async () => {
    if (!modification.trim() || !itinerary) return;
    setLoading(true);
    try {
      const { data } = await tripPlannerApi.modify(itinerary.id, modification.trim());
      setItinerary(data);
      setModification('');
    } catch {
      Alert.alert('Error', 'Failed to modify itinerary.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>AI Trip Planner</Text>
      <Text style={styles.subtitle}>
        Describe your ideal trip and we&apos;ll create a personalized itinerary.
      </Text>

      <TextInput
        style={styles.textArea}
        placeholder="e.g. 3-day adventure trip in Nairobi with a $200 budget, interested in culture and food"
        value={input}
        onChangeText={setInput}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate} disabled={loading}>
        {loading && !itinerary ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Generate Itinerary</Text>
        )}
      </TouchableOpacity>

      {loading && !itinerary && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Crafting your perfect itinerary...</Text>
        </View>
      )}

      {itinerary && (
        <View style={styles.itineraryCard}>
          <View style={styles.costBox}>
            <Text style={styles.costLabel}>Total Estimated Cost</Text>
            <Text style={styles.costValue}>
              {itinerary.totalCost.currency} {itinerary.totalCost.amount?.toLocaleString()}
            </Text>
          </View>

          {itinerary.experiences.map((exp, idx) => (
            <View key={exp.experienceId} style={styles.expItem}>
              <View style={styles.expNumber}>
                <Text style={styles.expNumberText}>{idx + 1}</Text>
              </View>
              <View style={styles.expContent}>
                <Text style={styles.expTitle}>
                  {exp.experience?.title || `Experience ${idx + 1}`}
                </Text>
                {exp.suggestedDate && (
                  <Text style={styles.expMeta}>
                    {new Date(exp.suggestedDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                )}
                {exp.experience && (
                  <Text style={styles.expMeta}>
                    {exp.experience.duration}h · {exp.experience.price.currency}{' '}
                    {exp.experience.price.amount}
                  </Text>
                )}
                <Text style={styles.expReasoning}>{exp.reasoning}</Text>
              </View>
            </View>
          ))}

          {/* Modification input */}
          <View style={styles.modifySection}>
            <Text style={styles.modifyLabel}>Modify this itinerary</Text>
            <TextInput
              style={styles.modifyInput}
              placeholder="e.g. Replace the second activity with something outdoors"
              value={modification}
              onChangeText={setModification}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 8 }]}
              onPress={handleModify}
              disabled={loading || !modification.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Apply Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
    minHeight: 100,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  loadingBox: { alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  itineraryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24 },
  costBox: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, marginBottom: 16 },
  costLabel: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  costValue: { fontSize: 22, fontWeight: '700', color: '#1E40AF', marginTop: 2 },
  expItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expNumberText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  expContent: { flex: 1 },
  expTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  expMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  expReasoning: { fontSize: 13, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' },
  modifySection: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  modifyLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modifyInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    minHeight: 60,
  },
});
