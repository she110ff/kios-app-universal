import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import 'react-native-get-random-values';
import '@ethersproject/shims';
import { saveSecure, saveSecureValue } from '../../utils/secure.store';
import ImportShopPrivateKey from '../../components/ImportShopPrivateKey';
import { Box, VStack } from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import { Wallet } from '@ethersproject/wallet';
import * as Device from 'expo-device';
import { getClient } from '../../utils/client';
import { AUTH_STATE } from '../../stores/user.store';
import { useTranslation } from 'react-i18next';
import ImportPrivateKey from '../../components/ImportPrivateKey';
import {
  activatePushNotification,
  registerPushTokenWithClient,
} from '../../utils/push.token';
import { WrapBox } from '../../components/styled/layout';
import { WrapButton } from '../../components/styled/button';
import { ActiveButtonText } from '../../components/styled/text';

const Secret = observer(({ navigation }) => {
  const { t } = useTranslation();
  const { userStore, secretStore } = useStores();
  const [fromOtherWallet, setFromOtherWallet] = useState(false);
  const [nextScreen, setNextScreen] = useState('none');

  useEffect(() => {
    const nc =
      process.env.EXPO_PUBLIC_APP_KIND === 'shop' ? 'ShopReg' : 'PhoneAuth';
    setNextScreen(nc);
  }, []);

  async function createWallet() {
    try {
      const wallet = Wallet.createRandom();

      console.log('address :', wallet.address);
      console.log('mnemonic :', wallet.mnemonic);
      console.log('privateKey :', wallet.privateKey);

      await saveSecureValue('address', wallet.address);
      await saveSecureValue('mnemonic', JSON.stringify(wallet.mnemonic));
      await saveSecureValue('privateKey', wallet.privateKey);

      await saveSecure(
        wallet.privateKey,
        secretStore,
        t('secret.alert.wallet.invalid'),
      );
      await activatePushNotification(t, secretStore, userStore);

      resetPinCode();
    } catch (e) {
      alert('error createWallet :' + JSON.stringify(e.message));
    }
  }

  async function tt() {
    userStore.setLoading(true);
    setTimeout(async () => {
      await createWallet();
    }, 100);
  }

  function resetPinCode() {
    userStore.setLoading(false);
    alert(t('secret.alert.wallet.done'));
    navigation.navigate(nextScreen);
  }

  async function saveKey(key) {
    console.log('===== saveKey > key :', key);
    const ret = await saveSecure(
      key,
      secretStore,
      t('secret.alert.wallet.invalid'),
    );
    if (!ret) {
      alert(t('secret.alert.wallet.invalid'));
    } else {
      await activatePushNotification(t, secretStore, userStore);
      resetPinCode();
    }
  }

  async function saveKeyForShop(key) {
    const ret = await saveSecure(
      key,
      secretStore,
      t('secret.alert.wallet.invalid'),
    );
    if (!ret) {
      alert(t('secret.alert.wallet.invalid'));
    } else {
      setFromOtherWallet(true);
    }
    userStore.setLoading(false);
  }

  async function afterSelectingShop(selectedShopId) {
    await activatePushNotification(t, secretStore, userStore, selectedShopId);
    userStore.setAuthState(AUTH_STATE.DONE);
  }

  return (
    <WrapBox style={{ backgroundColor: userStore.contentColor }}>
      <MobileHeader
        title={t('secret.header.title')}
        subTitle={t('secret.header.subtitle')}
      />
      <VStack mt={50}>
        <Box>
          <WrapButton onPress={tt}>
            <ActiveButtonText>{t('wallet.create')}</ActiveButtonText>
          </WrapButton>
        </Box>
        {nextScreen === 'ShopReg' ? (
          <ImportShopPrivateKey
            saveKey={saveKeyForShop}
            fromOtherWallet={fromOtherWallet}
            afterSelectingShop={afterSelectingShop}
            client={secretStore.client}
          />
        ) : (
          <ImportPrivateKey saveKey={saveKey} />
        )}
      </VStack>
    </WrapBox>
  );
});

export default Secret;
