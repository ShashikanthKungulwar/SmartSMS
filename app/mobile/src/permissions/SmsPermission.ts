import { PermissionsAndroid } from 'react-native';

export async function requestSmsPermissions(): Promise<boolean> {
  const grants = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);
  return Object.values(grants).every(g => g === 'granted');
}