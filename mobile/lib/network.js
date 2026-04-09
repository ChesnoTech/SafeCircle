import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

let cachedStatus = { isConnected: true, isInternetReachable: true };

export function getNetworkStatus() {
  return cachedStatus;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState(cachedStatus);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next = {
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
      };
      cachedStatus = next;
      setStatus(next);
    });

    return unsubscribe;
  }, []);

  return status;
}
