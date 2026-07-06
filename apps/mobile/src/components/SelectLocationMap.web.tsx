import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { c } from "../theme";
import { StripedPlaceholder } from "./ui";

/** Web fallback — react-native-maps has no web support, so this keeps the prototype's static pin. */
export function SelectLocationMap({ lat, lng }: { lat: number; lng: number; onChange?: (coords: { lat: number; lng: number }) => void }) {
  return (
    <View>
      <StripedPlaceholder label="MAP PREVIEW" style={{ height: 220, marginBottom: 14 }} />
      <View style={{ position: "relative", marginTop: -140, alignItems: "center", marginBottom: 96 }}>
        <Svg width={34} height={46} viewBox="0 0 34 46">
          <Path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 29 17 29s17-16.3 17-29C34 7.6 26.4 0 17 0z" fill={c.orange} />
          <Circle cx={17} cy={17} r={7} fill="#fff" />
        </Svg>
      </View>
    </View>
  );
}
