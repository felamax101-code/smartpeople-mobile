import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';



interface Props{
    visible:boolean
    onClose:()=>void
    guidelines:string[]
    title:string
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');


export default function GuidelinesModal({
  visible,
  onClose,
  guidelines = [],
  title ,
}:Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop - tap outside to close */}
      <TouchableOpacity
        style={[styles.backdrop]}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={[styles.sheet]}>
        {/* Drag handle indicator */}
        <View style={[styles.handleContainer]}>
          <View style={[styles.handle]} />
        </View>

        {/* Header */}
        <View style={[styles.header]}>
          <Text style={[styles.title]} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.closeButtonText]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable guidelines list */}
        <ScrollView
          style={[styles.scrollArea]}
          contentContainerStyle={[styles.scrollContent]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {guidelines.length === 0 ? (
            <Text style={[styles.emptyText]}>No guidelines to display.</Text>
          ) : (
            guidelines.map((item, index) => (
              <View key={index} style={[styles.itemRow]}>
                <Text style={[styles.itemBullet]}>{index + 1}.</Text>
                <Text style={[styles.itemText]}>{item}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.4,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D1D6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    flexShrink: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 15,
    color: '#3C3C43',
    fontWeight: '600',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  itemBullet: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 8,
    minWidth: 22,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: '#3C3C43',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
  },
});
