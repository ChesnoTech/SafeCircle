import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useLocationStore, useAlertStore } from '../../lib/store';

export default function MapScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();
  const { alerts } = useAlertStore();

  if (!latitude || !longitude) {
    return (
      <View style={styles.center}>
        <Text>Getting location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            coordinate={{
              latitude: alert.latitude,
              longitude: alert.longitude,
            }}
            title={alert.name}
            description={alert.clothing_description || 'Missing person'}
            pinColor="#DC2626"
            onCalloutPress={() => router.push(`/alert/${alert.id}`)}
          />
        ))}

        {alerts.map((alert) => (
          <Circle
            key={`circle-${alert.id}`}
            center={{
              latitude: alert.latitude,
              longitude: alert.longitude,
            }}
            radius={(alert.alert_radius_km || 5) * 1000}
            fillColor="rgba(220, 38, 38, 0.1)"
            strokeColor="rgba(220, 38, 38, 0.3)"
            strokeWidth={1}
          />
        ))}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendText}>
          {alerts.length} active alert{alerts.length !== 1 ? 's' : ''} nearby
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  legend: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#fff', padding: 12, borderRadius: 12,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, alignItems: 'center',
  },
  legendText: { fontSize: 14, fontWeight: '600', color: '#333' },
});
