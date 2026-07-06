import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

/** Native (iOS/Android) implementation — real interactive map with a draggable pin. */
export function SelectLocationMap({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const region: Region = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  return (
    <MapView style={styles.map} initialRegion={region}>
      <Marker
        coordinate={{ latitude: lat, longitude: lng }}
        draggable
        onDragEnd={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onChange({ lat: latitude, lng: longitude });
        }}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderRadius: 12, marginBottom: 14 },
});
