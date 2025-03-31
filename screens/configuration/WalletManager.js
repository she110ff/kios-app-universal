import { trunk, useStores } from '../../stores';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import 'react-native-get-random-values';
import '@ethersproject/shims';
import * as Clipboard from 'expo-clipboard';

import {
  getSecureValue,
  saveSecure,
  saveSecureValue,
} from '../../utils/secure.store';
import ImportShopPrivateKey from '../../components/ImportShopPrivateKey';
import {
  Box,
  ButtonText,
  Button,
  Center,
  VStack,
  HStack,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalBody,
  Heading,
  Text,
  FormControl,
  FormControlHelper,
  FormControlHelperText,
  Input,
  View,
  InputField,
  ButtonGroup,
  Icon,
  ModalCloseButton,
  ModalHeader,
  CloseIcon,
} from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Device from 'expo-device';
import { AUTH_STATE } from '../../stores/user.store';
import { useTranslation } from 'react-i18next';
import ImportPrivateKey from '../../components/ImportPrivateKey';
import { WrapBox } from '../../components/styled/layout';
import {
  ActiveButtonText,
  ActiveWhiteButtonText,
  HeaderText,
  NumberText,
  ParaText,
  RobotoMediumText,
  RobotoSemiBoldText,
  SubHeaderText,
} from '../../components/styled/text';
import { WrapButton, WrapWhiteButton } from '../../components/styled/button';
import {
  activatePushNotification,
  registerPushTokenWithClient,
} from '../../utils/push.token';
import { truncateMiddleString } from '../../utils/convert';

const WalletManager = observer(({ navigation }) => {
  const { t } = useTranslation();
  const { userStore, secretStore, loyaltyStore, pinStore } = useStores();
  const [privateKey, setPrivateKey] = useState(
    '0000000000000000000000000000000000000000000000000000000000000001',
  );
  const [showModal, setShowModal] = useState(false);
  const [showInitWalletModal, setShowInitWalletModal] = useState(false);
  const [fromOtherWallet, setFromOtherWallet] = useState(false);
  const [nextScreen, setNextScreen] = useState('none');

  useEffect(() => {
    const nc =
      process.env.EXPO_PUBLIC_APP_KIND === 'shop' ? 'ShopReg' : 'PhoneAuth';
    setNextScreen(nc);
  }, []);

  useEffect(() => {
    async function fetchKey() {
      const key = await getSecureValue('privateKey');
      setPrivateKey(key);
    }
    fetchKey();
  }, []);

  async function exportWallet() {
    setShowModal(true);
  }

  async function saveKey(key) {
    console.log('wallet manager > saveKey > key :', key);
    const ret = await saveSecure(
      key,
      secretStore,
      t('secret.alert.wallet.invalid'),
    );
    userStore.setLoading(false);

    if (!ret) {
      alert(t('secret.alert.wallet.invalid'));
    } else {
      await activatePushNotification(t, secretStore, userStore);
      setFromOtherWallet(true);
      alert(t('config.wallet.alert.import.done'));
      navigation.navigate('Wallet');
    }
  }

  async function saveKeyForShop(key) {
    const ret = await saveSecure(
      key,
      secretStore,
      t('secret.alert.wallet.invalid'),
    );
    console.log('saveKeyForShop');

    if (!ret) {
      alert(t('secret.alert.wallet.invalid'));
    } else {
      userStore.setLoading(false);
      setFromOtherWallet(true);
    }
  }

  async function afterSelectingShop(selectedShopId) {
    alert(t('config.wallet.alert.import.done'));
    await activatePushNotification(t, secretStore, userStore, selectedShopId);
    navigation.navigate('Wallet');
  }

  async function warnInitializeWallet() {
    setShowInitWalletModal(true);
  }
  async function initAuth() {
    clearInterval(userStore.walletInterval);
    userStore.reset();
    pinStore.reset();
    loyaltyStore.reset();
    secretStore.reset();
    await saveSecureValue('address', '');
    await saveSecureValue('mnemonic', '');
    await saveSecureValue('privateKey', '');
    userStore.setAuthState(AUTH_STATE.INIT);
  }

  return (
    <WrapBox
      style={{ paddingTop: 35, backgroundColor: userStore.contentColor }}>
      <MobileHeader
        title={t('config.wallet.header.title')}
        subTitle={t('config.wallet.header.subtitle')}
      />
      <VStack pt={50}>
        <Box>
          <WrapButton onPress={() => exportWallet()}>
            <ActiveButtonText>{t('wallet.export')}</ActiveButtonText>
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
        <Box mt={10}>
          <WrapButton onPress={() => warnInitializeWallet()}>
            <ActiveButtonText>{t('wallet.init')}</ActiveButtonText>
          </WrapButton>
        </Box>
      </VStack>
      <Box>
        <KeyboardAwareScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={{ marginBottom: 150 }}
          enableOnAndroid={true}
          scrollEnabled={true}
          extraScrollHeight={100}
          keyboardShouldPersistTaps='handled'
          scrollToOverflowEnabled={true}
          enableAutomaticScroll={true}>
          <View>
            <Modal
              size='lg'
              isOpen={showModal}
              onClose={() => {
                setShowModal(false);
              }}>
              <ModalBackdrop />
              <ModalContent bg='#FFFFFF'>
                {/*<ModalHeader>*/}

                {/*  <ModalCloseButton>*/}
                {/*    <Icon as={CloseIcon} />*/}
                {/*  </ModalCloseButton>*/}
                {/*</ModalHeader>*/}
                <ModalBody mt={30} mb={10} mx={10}>
                  <VStack>
                    <HeaderText>{t('config.wallet.modal.heading')}</HeaderText>
                    <ParaText mt={7}>
                      {t('config.wallet.modal.body.text.a')}
                    </ParaText>
                    <ParaText mt={7}>
                      {t('config.wallet.modal.body.text.b')}
                    </ParaText>
                  </VStack>
                  <VStack py='$2' space='sm'>
                    <FormControl>
                      <FormControlHelper>
                        <SubHeaderText style={{ color: '#555555' }}>
                          {t('config.wallet.modal.body.text.c')}
                        </SubHeaderText>
                      </FormControlHelper>
                      <Input h={50} borderWidth={0}>
                        <InputField
                          pb={5}
                          fontSize={15}
                          lightHeight={16}
                          fontFamily='Roboto-Medium'
                          color='#12121D'
                          style={{
                            fontWeight: '500',
                            borderWidth: 1,
                            borderRadius: 6,
                            borderColor: '#C0C0C0',
                            backgroundColor: '#E4E4E450',
                          }}
                          value={truncateMiddleString(privateKey || '', 30)}
                        />
                      </Input>
                    </FormControl>
                    {nextScreen === 'ShopReg' ? (
                      <FormControl>
                        <FormControlHelper>
                          <SubHeaderText style={{ color: '#555555' }}>
                            {t('config.wallet.modal.body.text.d')}
                          </SubHeaderText>
                        </FormControlHelper>
                        <Input h={50} borderWidth={0}>
                          <InputField
                            pb={5}
                            fontSize={15}
                            lightHeight={16}
                            fontFamily='Roboto-Medium'
                            color='#12121D'
                            style={{
                              fontWeight: '500',
                              borderWidth: 1,
                              borderRadius: 6,
                              borderColor: '#C0C0C0',
                              backgroundColor: '#E4E4E450',
                            }}
                            value={truncateMiddleString(
                              userStore.shopId || '',
                              30,
                            )}
                          />
                        </Input>
                      </FormControl>
                    ) : null}
                  </VStack>

                  <HStack flex={1} mt={10}>
                    <Box flex={1}>
                      <WrapButton
                        onPress={async () => {
                          await Clipboard.setStringAsync(privateKey);
                          setShowModal(false);
                        }}>
                        <ActiveButtonText>
                          {t('config.wallet.modal.body.text.e')}
                        </ActiveButtonText>
                      </WrapButton>
                    </Box>
                    {nextScreen === 'ShopReg' ? (
                      <Box flex={1} ml={10}>
                        <WrapButton
                          onPress={async () => {
                            await Clipboard.setStringAsync(userStore.shopId);
                            setShowModal(false);
                          }}>
                          <ActiveButtonText fontSize={15}>
                            {t('config.wallet.modal.body.text.f')}
                          </ActiveButtonText>
                        </WrapButton>
                      </Box>
                    ) : null}
                  </HStack>
                </ModalBody>
              </ModalContent>
            </Modal>

            <Modal
              size='lg'
              isOpen={showInitWalletModal}
              onClose={() => {
                setShowInitWalletModal(false);
              }}>
              <ModalBackdrop />
              <ModalContent bg='#FFFFFF'>
                <ModalBody mt={30} mb={10} mx={10}>
                  <VStack>
                    <HeaderText>{t('wallet.init')}</HeaderText>
                    <ParaText mt={7}>
                      {t('config.wallet.modal.body.text.g')}
                    </ParaText>
                    <ParaText mt={7}>
                      {t('config.wallet.modal.body.text.h')}
                    </ParaText>
                  </VStack>

                  <HStack flex={1} mt={30}>
                    <Box flex={1} mr={5}>
                      <WrapWhiteButton
                        onPress={async () => {
                          setShowInitWalletModal(false);
                        }}>
                        <ActiveWhiteButtonText>
                          {t('button.press.b')}
                        </ActiveWhiteButtonText>
                      </WrapWhiteButton>
                    </Box>
                    <Box flex={1} ml={5}>
                      <WrapButton
                        onPress={async () => {
                          setShowInitWalletModal(false);
                          await initAuth();
                        }}>
                        <ActiveButtonText>
                          {t('button.press.a')}
                        </ActiveButtonText>
                      </WrapButton>
                    </Box>
                  </HStack>
                </ModalBody>
              </ModalContent>
            </Modal>
          </View>
        </KeyboardAwareScrollView>
      </Box>
    </WrapBox>
  );
});

export default WalletManager;
