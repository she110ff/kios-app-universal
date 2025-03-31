import * as SecureStore from 'expo-secure-store';
import '@ethersproject/shims';
import 'react-native-get-random-values';
import { Wallet } from '@ethersproject/wallet';

export async function saveSecureValue(key, value) {
  await SecureStore.setItemAsync(key, value);
}

export async function getSecureValue(key) {
  let result = await SecureStore.getItemAsync(key);
  if (result) {
    // console.log("🔐 Here's your value 🔐 \n" + result);
    return result;
  } else {
    console.log('No values stored under that key.');
    return null;
  }
}

export async function saveSecure(key, secretStore, invalid) {
  key = key.trim();
  let wallet;
  try {
    wallet = new Wallet(key);
  } catch (e) {
    console.log('Invalid private key.');
    // alert(invalid);
    return false;
  }
  try {
    secretStore.setAddress(wallet.address);
    await saveSecureValue('address', wallet.address);
    await saveSecureValue('privateKey', key);
    await secretStore.setClient();
    return true;
  } catch (e) {
    alert('saveSecure :' + JSON.stringify(e.message));
    return false;
  }
}
