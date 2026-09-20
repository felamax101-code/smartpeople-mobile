
import React from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModeratorRoleKey } from '@/types';
import { ROLE_LABELS } from './PanelItems';
interface MyRolesModalProps {
  visible: boolean;
  onClose: () => void;
  roles: ModeratorRoleKey[];
}

export function MyRolesModal({ visible, onClose, roles }: MyRolesModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container]}>
        <View style={[styles.header]}>
          <Text style={[styles.title]}>My Roles</Text>
          <Pressable onPress={onClose}>
            <Text style={[styles.closeText]}>Close</Text>
          </Pressable>
        </View>

        <FlatList
          data={roles}
          keyExtractor={(item) => item}
          contentContainerStyle={[styles.listContent]}
          renderItem={({ item, index }) => (
            <View style={[styles.roleRow]}>
              <Text style={[styles.roleIndex]}>{index + 1}.</Text>
              <Text style={[styles.roleLabel]}>{ROLE_LABELS[item] ?? item}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={[styles.empty]}>
              <Text>No roles assigned yet</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeText: { color: '#2563eb', fontSize: 15 },
  listContent: { paddingHorizontal: 16 },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 8,
  },
  roleIndex: { fontSize: 15, fontWeight: '600', color: '#666', width: 24 },
  roleLabel: { fontSize: 15, color: '#111' },
  empty: { alignItems: 'center', paddingVertical: 40 },
});

