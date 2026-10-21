import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNotificationToast } from '@/components/activityIndicator/ToastNotification';
export function useUnstableConnectionWarning() {
  const drops = useRef<number[]>([]);          // timestamps of recent drops
  const lastReachable = useRef<boolean|null>(true);
  const warned = useRef(false);
  const {showNotifToast}=useNotificationToast()
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const reachable = state.isConnected && state.isInternetReachable !== false;

      // Record a drop when going from reachable -> not reachable
      if ( !reachable) {
                  showNotifToast('Unstable connection. Your internet seems to be dropping in and out.',"error");

        const now = Date.now();
        drops.current = [...drops.current.filter(t => now - t < 30000), now];

        // 3+ drops in 30 seconds = unstable
        if (drops.current.length >= 3 && !warned.current) {
          warned.current = true;
          showNotifToast('Unstable connection. Your internet seems to be dropping in and out.',"error");
          setTimeout(() => (warned.current = false), 60000); // avoid spamming
        }
      }

      // Optional: weak Wi-Fi signal (Android)
      if (state.type === 'wifi' && state.details?.strength != null && state.details.strength < 30) {
        showNotifToast('Unstable connection. Your internet seems to be dropping in and out.',"error");
      }

      lastReachable.current = reachable;
    });

    return unsubscribe;
  }, []);
}