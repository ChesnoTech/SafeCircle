// Web shim for react-native-maps (native-only module)
import { View, Text } from 'react-native';

function MapView(props) {
  return (
    <View style={[{ flex: 1, backgroundColor: '#e8e8e8', justifyContent: 'center', alignItems: 'center' }, props.style]}>
      <Text style={{ color: '#888', fontSize: 14 }}>Map (native only)</Text>
      {props.children}
    </View>
  );
}

function Marker() { return null; }
function Circle() { return null; }
function Polygon() { return null; }
function Polyline() { return null; }
function Callout() { return null; }
function Heatmap() { return null; }

MapView.Marker = Marker;
MapView.Circle = Circle;
MapView.Polygon = Polygon;
MapView.Polyline = Polyline;
MapView.Callout = Callout;

export default MapView;
export { Marker, Circle, Polygon, Polyline, Callout, Heatmap };
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
