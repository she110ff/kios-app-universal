import { Alert, Linking, Platform } from 'react-native';
import { MobileType } from 'kios-sdk-client-v2';
import * as Device from 'expo-device';
import * as Clipboard from 'expo-clipboard';
import { registerForPushNotificationsAsync } from '../hooks/usePushNotification';
export async function activatePushNotification(
  t,
  secretStore,
  userStore,
  shopId,
) {
  try {
    console.log(
      'activatePushNotification > userStore : ' + JSON.stringify(userStore),
    );
    const ret = await registerForPushNotificationsAsync(userStore);
    console.log('1');
    const token = userStore.expoPushToken;
    console.log('2');
    const language = userStore.lang.toLowerCase();
    console.log('3');
    const os = Platform.OS === 'android' ? 'android' : 'iOS';
    console.log('4');

    const now = new Date();
    console.log(
      'activatePushNotification > ' +
        `[${now.toLocaleDateString()} ${now.toLocaleTimeString()}] ` +
        'alert status : ' +
        ret +
        ', token : ' +
        token +
        ', language : ' +
        language +
        ', os : ' +
        os +
        ', shopId : ' +
        shopId +
        ', process.env.EXPO_PUBLIC_APP_KIND : ' +
        process.env.EXPO_PUBLIC_APP_KIND +
        ', address :' +
        secretStore.address,
    );
    await Clipboard.setStringAsync(
      'activatePushNotification > ' +
        `[${now.toLocaleDateString()} ${now.toLocaleTimeString()}] ` +
        'alert status : ' +
        ret +
        ', token : ' +
        token +
        ', language : ' +
        language +
        ', os : ' +
        os +
        ', shopId : ' +
        shopId +
        ', process.env.EXPO_PUBLIC_APP_KIND : ' +
        process.env.EXPO_PUBLIC_APP_KIND +
        ', address :' +
        secretStore.address,
    );

    userStore.setRegisteredPushToken(false);

    if (ret === 'granted') {
      try {
        if (Device.isDevice) {
          if (process.env.EXPO_PUBLIC_APP_KIND === 'shop' && shopId) {
            await secretStore.client.ledger.registerMobileToken(
              token,
              language,
              os,
              MobileType.SHOP_APP,
              shopId,
            );
            userStore.setRegisteredPushToken(true);
          } else {
            if (process.env.EXPO_PUBLIC_APP_KIND === 'user') {
              await secretStore.client.ledger.registerMobileToken(
                token,
                language,
                os,
                MobileType.USER_APP,
              );
              userStore.setRegisteredPushToken(true);
            }
          }
        } else {
          alert('Not on device.');
          return false;
        }
        return true;
      } catch (e) {
        alert('register push notification error: ' + JSON.stringify(e.message));
        return false;
      }
    } else if (ret === 'denied') {
      // alert(t('permission.body.text.b', { appName: t('app.name') }));
      Alert.alert(t('permission.body.heading'), t('permission.body.text.b'), [
        { text: t('button.press.b'), style: 'cancel' },
        { text: t('button.press.e'), onPress: openAppSettings },
      ]);
      return false;
    } else {
      return false;
    }
  } catch (e) {
    alert('activate push notification error: ' + JSON.stringify(e.message));
    return false;
  }
}
const openAppSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:'); // iOS 설정 화면
  } else if (Platform.OS === 'android') {
    Linking.openSettings(); // Android 설정 화면
  }
};

export async function registerPushTokenWithClient(cc, userStore, appKind) {
  if (
    userStore.expoPushToken === '' ||
    userStore.enableNotification === false
  ) {
    userStore.setRegisteredPushToken(false);
    return false;
  }
  // alert(
  //   'registerPushTokenWithClient > userStore : ' + JSON.stringify(userStore),
  // );
  const token = userStore.expoPushToken;
  // alert('expo token :' + token);
  const language = userStore.lang.toLowerCase();
  const os = Platform.OS === 'android' ? 'android' : 'iOS';
  try {
    await cc.ledger.registerMobileToken(
      token,
      language,
      os,
      appKind === 'shop' ? MobileType.SHOP_APP : MobileType.USER_APP,
    );
    userStore.setRegisteredPushToken(true);
    return true;
  } catch (e) {
    // await Clipboard.setStringAsync(JSON.stringify(e));
    alert('register push ' + JSON.stringify(e.message));
    console.log('error : ', e);
    return false;
  }
}
