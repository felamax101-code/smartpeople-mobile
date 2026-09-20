import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useEnhancedVideoEditorStore } from './state/EnhancedVideoEditorStore';
interface CrashRecoveryWrapperProps {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
}

export const CrashRecoveryWrapper: React.FC<CrashRecoveryWrapperProps> = ({
  children,
  fallbackComponent
}) => {
  const [isRecovered, setIsRecovered] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const { isRecovering, recoveryError, recoverFromCrash } = useEnhancedVideoEditorStore();

  useEffect(() => {
    const performRecovery = async () => {
      try {
        console.log('[CrashRecovery] Starting recovery process...');
        await recoverFromCrash();
        console.log('[CrashRecovery] Recovery completed');
      } catch (error) {
        console.error('[CrashRecovery] Recovery failed:', error);
      } finally {
        setIsRecovered(true);
        setRecoveryAttempted(true);
      }
    };

    if (!recoveryAttempted) {
      performRecovery();
    }
  }, [recoverFromCrash, recoveryAttempted]);

  if (isRecovering || !recoveryAttempted) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.title}>Recovering Project</Text>
          <Text style={styles.subtitle}>
            Restoring your last edit session...
          </Text>
        </View>
      </View>
    );
  }

  if (recoveryError && !isRecovering) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorTitle}>Recovery Failed</Text>
          <Text style={styles.errorSubtitle}>
            We couldn't restore your last session. Starting fresh...
          </Text>
          <Text style={styles.errorDetail}>{recoveryError}</Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ff3b30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#636366',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
