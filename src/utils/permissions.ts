import * as Camera from "expo-camera";

import * as Location from "expo-location";

export async function requestAppPermissions() {
  // CAMERA

  const cameraPermission = await Camera.Camera.requestCameraPermissionsAsync();

  // LOCATION

  const locationPermission = await Location.requestForegroundPermissionsAsync();

  return {
    cameraGranted: cameraPermission.status === "granted",

    locationGranted: locationPermission.status === "granted",
  };
}
