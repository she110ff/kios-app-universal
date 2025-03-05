import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { useStores } from '../../stores';
import {
  Box,
  VStack,
  HStack,
  Button,
  Image,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalBody,
  useToast,
  Toast,
  ToastDescription,
  FormControl,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import { Amount, BOACoin } from 'kios-sdk-client-v2';
import {
  greaterFloatTexts,
  convertProperValue,
  convertShopProperValue,
  truncateMiddleString,
  validateNumber,
} from '../../utils/convert';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { BigNumber } from '@ethersproject/bignumber/src.ts';
import { getSecureValue, saveSecureValue } from '../../utils/secure.store';
import '@ethersproject/shims';
import { Wallet } from '@ethersproject/wallet';
import * as Device from 'expo-device';

import MobileHeader from '../../components/MobileHeader';
import { WrapBox, WrapDivider } from '../../components/styled/layout';
import {
  ActiveButtonText,
  ActiveWhiteButtonText,
  AppleSDGothicNeoSBText,
  HeaderText,
  NumberText,
  Para2Text,
  Para3Text,
  ParaText,
  PinButtonText,
  RobotoMediumText,
  RobotoRegularText,
  RobotoSemiBoldText,
} from '../../components/styled/text';
import {
  WrapButton,
  WrapHistoryButton,
  WrapWhiteButton,
} from '../../components/styled/button';
import * as yup from 'yup';
import { useFormik } from 'formik';

const Index = observer(({ navigation }) => {
  const { noteStore, secretStore, userStore, loyaltyStore } = useStores();
  const [showModal, setShowModal] = useState(false);

  const [modalHeader, setModalHeader] = useState('');
  const [modalContent, setModalContent] = useState('');

  const [providedAmount, setProvidedAmount] = useState(new Amount(0, 18));
  const [usedAmount, setUsedAmount] = useState(new Amount(0, 18));
  const [refundedAmount, setRefundedAmount] = useState(new Amount(0, 18));
  const [refundableAmount, setRefundableAmount] = useState(new Amount(0, 18));
  const [receiveTokenAmount, setReceiveTokenAmount] = useState(new BOACoin(0));

  const [userTokenBalance, setUserTokenBalance] = useState(new BOACoin(0));
  const [userTokenRate, setUserTokenRate] = useState(new BOACoin(0));
  const [oneTokenRate, setOneTokenRate] = useState(new BOACoin(0));

  const [ableToDo, setAbleToDo] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const { t } = useTranslation();

  const toast = useToast();

  useEffect(() => {
    console.log('================= userStore', userStore);

    fetchClient().then(() =>
      console.log(
        'end of wallet fetch client > last :',
        loyaltyStore.lastUpdateTime,
      ),
    );
  }, [loyaltyStore.lastUpdateTime]);

  useEffect(() => {
    const newVersion = process.env.EXPO_PUBLIC_APP_VERSION;
    console.log('version : ', noteStore.version, ', newVersion :', newVersion);
    if (Device.isDevice) {
      if (noteStore.version === '0.0.0') {
        noteStore.setVersion(newVersion);
      } else if (noteStore.version !== newVersion) {
      }
    }
  }, []);

  async function fetchClient() {
    await setData();
    await fetchBalances();
  }
  async function fetchBalances() {
    if (userStore.walletInterval > 0) clearInterval(userStore.walletInterval);

    const id = setInterval(async () => {
      try {
        await setData();
      } catch (e) {
        console.log('setData > e3:', e);
      }
    }, 5000);
    userStore.setWalletInterval(id);
  }

  async function setData() {
    const pkey = await getSecureValue('privateKey');
    if (pkey !== privateKey) {
      await secretStore.client.useSigner(new Wallet(pkey));
      setPrivateKey(pkey);
    }

    const shopInfo = await secretStore.client.shop.getShopInfo(
      userStore.shopId,
    );
    // console.log('shopInfo :', shopInfo);

    const convProvidedAmount = new Amount(shopInfo.providedAmount, 18);
    const convUsedAmount = new Amount(shopInfo.usedAmount, 18);
    const convRefundedAmount = new Amount(shopInfo.refundedAmount, 18);
    const refundableAmountTmp =
      await secretStore.client.shop.getRefundableAmount(userStore.shopId);
    const convRefundableAmount = new Amount(
      refundableAmountTmp.refundableAmount,
      18,
    );

    setProvidedAmount(convProvidedAmount);
    setUsedAmount(convUsedAmount);
    setRefundedAmount(convRefundedAmount);
    setRefundableAmount(convRefundableAmount);

    const tokenBalance = await secretStore.client.ledger.getSideChainBalance(
      secretStore.address,
    );
    // console.log('tokenBalance :', tokenBalance.toString());
    const tokenBalConv = new BOACoin(tokenBalance);
    // console.log('tokenBalance :', tokenBalConv.toBOAString());
    setUserTokenBalance(tokenBalConv);

    let userTokenCurrencyRate =
      await secretStore.client.currency.tokenToCurrency(
        tokenBalance,
        userStore.currency.toLowerCase(),
      );

    const userTokenCurrencyConv = new BOACoin(userTokenCurrencyRate);
    // console.log('userTokenCurrencyConv :', userTokenCurrencyConv.toBOAString());
    setUserTokenRate(userTokenCurrencyConv);

    const oneTokenAmount = BOACoin.make(1, 18).value;
    let oneTokenCurrencyRate =
      await secretStore.client.currency.tokenToCurrency(
        oneTokenAmount,
        userStore.currency.toLowerCase(),
      );

    // console.log('oneTokenCurrencyRate :', oneTokenCurrencyRate.toString());
    const oneTokenConv = new BOACoin(oneTokenCurrencyRate);
    // console.log('boaBal :', boaConv.toBOAString());
    setOneTokenRate(oneTokenConv);
  }

  const handleQRSheet = async () => {
    // await fetchPoints();
    secretStore.setShowQRSheet(!secretStore.showQRSheet);
    console.log('handle QR sheet : ', secretStore.showQRSheet);
  };

  const convertToToken = () => {
    console.log('convert to token');
    setShowModal(true);
  };

  const confirmModal = async () => {
    console.log('confirm');
    setShowModal(false);
    userStore.setLoading(true);

    const steps = [];
    try {
      for await (const step of secretStore.client.shop.refund(
        userStore.shopId,
        refundableAmount.value,
      )) {
        steps.push(step);
        console.log('request step :', step);
      }
      if (steps.length === 3 && steps[2].key === 'done') {
        alert(t('wallet.modal.b.alert.done'));
      }
      userStore.setLoading(false);
    } catch (e) {
      await Clipboard.setStringAsync(JSON.stringify(e));
      console.log('error : ', e);
      userStore.setLoading(false);
      alert(t('wallet.modal.b.alert.fail') + JSON.stringify(e.message));
    }
  };

  const handleComplete = () => {
    console.log('handle complete');
    setModalHeader(t('wallet.modal.a.heading'));
    setModalContent(t('wallet.modal.a.heading.description'));
    setShowModal(true);
  };

  const handleRequest = () => {
    console.log('handle request');
    setModalHeader(t('wallet.modal.b.heading'));
    setModalContent(t('wallet.modal.b.heading.description'));
    setShowModal(true);
  };

  const registerInitialValues = {
    n1: '',
  };
  const registerSchema = yup.object().shape({
    n1: yup
      .string()
      .matches(/^(\-)?(\d+)?(\.\d+)?$/, 'Invalid number format')
      .test(
        'positive',
        'Number must be greater than or equal to 0',
        (value) => parseFloat(value) > 0,
      )
      .required(),
  });

  const formik = useFormik({
    initialValues: registerInitialValues,
    validationSchema: registerSchema,

    onSubmit: (values, { resetForm }) => {
      console.log('form values :', values);
      if (userStore.isDeposit)
        doDeposit().then((v) => navigation.navigate('Wallet'));
      else doWithdraw().then((v) => navigation.navigate('Wallet'));
      resetForm();
    },
  });

  const takeMaxAmount = () => {
    const balance = convertProperValue(refundableAmount.toBOAString(), 0);
    changeAmount(balance);
  };

  const changeAmount = async (v) => {
    try {
      const balance = convertProperValue(refundableAmount.toBOAString(), 0);
      if (
        validateNumber(v) &&
        greaterFloatTexts(v, 0) &&
        greaterFloatTexts(balance, v)
      ) {
        userStore.setLoading(true);
        formik.setFieldValue('n1', v);
        const inputAmount = Amount.make(v, 18).value;
        const convertedToken =
          await secretStore.client.currency.pointToToken(inputAmount);
        const amount = new BOACoin(convertedToken);
        console.log('converted token amount :', amount.toBOAString());
        setReceiveTokenAmount(amount);
        setAbleToDo(true);
        userStore.setLoading(false);
      } else {
        formik.setFieldValue('n1', '');
        setAbleToDo(false);
        setReceiveTokenAmount(Amount.make(0, 18));
        console.log('below zero');
      }
    } catch (e) {
      console.log(e);
      formik.setFieldValue('n1', '');
      setAbleToDo(false);
      userStore.setLoading(false);
    }
  };

  const goToDeposit = (tp) => {
    if (tp === 'deposit') {
      userStore.setIsDeposit(true);
    } else userStore.setIsDeposit(false);
    navigation.navigate('Deposit');
  };

  return (
    <WrapBox style={{ backgroundColor: '#F3F3F4', paddingTop: 3 }}>
      <Box alignItems='flex-between'>
        <ParaText style={{ color: '#fff' }}>
          {truncateMiddleString(secretStore.address || '', 8)}
        </ParaText>
        <Button
          bg='#5C66D5'
          rounded='$xl'
          h={26}
          w={138}
          variant='link'
          onPress={async () => {
            await Clipboard.setStringAsync(secretStore.address);

            toast.show({
              placement: 'top',
              duration: 500,
              render: ({ id }) => {
                const toastId = 'toast-' + id;
                return (
                  <Toast nativeID={toastId} action='attention' variant='solid'>
                    <VStack space='xs'>
                      <ToastDescription>
                        {t('wallet.toast.copy')}
                      </ToastDescription>
                    </VStack>
                  </Toast>
                );
              },
            });
          }}>
          <ParaText style={{ color: '#fff' }}>
            {truncateMiddleString(secretStore.address || '', 8)}
          </ParaText>
          {/*<ButtonIcon as={CopyIcon} ml={5} />*/}
          <Image
            ml={9}
            my={3}
            h={13.3}
            w={13.3}
            alt='alt'
            source={require('../../assets/images/copy.png')}
          />
        </Button>
      </Box>
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack alignItems='center' pt={50}>
          <MobileHeader
            title={userStore.shopName}
            subTitle={t('wallet.heading.description', {
              appName: t('app.name'),
            })}></MobileHeader>
        </VStack>

        <VStack mt={40} p={20} bg='white' rounded='$lg'>
          <HStack justifyContent='space-between'>
            <Para2Text style={{ color: '#5C66D5' }}>
              • {t('wallet.modal.body.a')}
            </Para2Text>
            <WrapHistoryButton
              borderRadius='$full'
              h={24}
              pt={-2}
              onPress={() => navigation.navigate('MileageProvideHistory')}>
              <Para2Text style={{ color: '#707070' }}>
                {t('wallet.link.history.redemption')}
              </Para2Text>
            </WrapHistoryButton>
          </HStack>

          <Box mt={18}>
            <Para3Text>{t('wallet.modal.body.b')}</Para3Text>
            <HStack mt={4} alignItems='center'>
              <NumberText>
                {convertProperValue(providedAmount.toBOAString(), 0)}{' '}
              </NumberText>
              <Para3Text pt={4} color='#12121D' style={{ fontWeight: 400 }}>
                Point
              </Para3Text>
            </HStack>
          </Box>
          <WrapDivider></WrapDivider>
          <Box mt={4}>
            <Para3Text>{t('wallet.modal.body.c')}</Para3Text>
            <HStack mt={4} alignItems='center'>
              <NumberText>
                {convertProperValue(usedAmount.toBOAString(), 0)}{' '}
              </NumberText>
              <Para3Text pt={4} color='#12121D' style={{ fontWeight: 400 }}>
                Point
              </Para3Text>
            </HStack>
          </Box>
        </VStack>

        <VStack mt={12} p={20} bg='white' rounded='$lg'>
          <HStack justifyContent='space-between'>
            <Para2Text style={{ color: '#5C66D5' }}>
              • {t('wallet.modal.body.d')}
            </Para2Text>
            <WrapHistoryButton
              borderRadius='$full'
              h={24}
              pt={-2}
              onPress={() => navigation.navigate('MileageAdjustmentHistory')}>
              <Para2Text style={{ color: '#707070' }}>
                {t('wallet.link.history.settlement')}
              </Para2Text>
            </WrapHistoryButton>
          </HStack>

          <Box mt={4}>
            <HStack justifyContent='space-between' alignItems='center'>
              <Box>
                <Para3Text>{t('wallet.modal.body.f')}</Para3Text>
                <HStack mt={4} alignItems='center'>
                  <NumberText>
                    {convertProperValue(refundableAmount.toBOAString(), 0)}{' '}
                  </NumberText>
                  <Para3Text pt={4} color='#12121D' style={{ fontWeight: 400 }}>
                    Point
                  </Para3Text>
                </HStack>
              </Box>
              <Box>
                {refundableAmount.value.gt(BigNumber.from(0)) ? (
                  <WrapButton h={36} onPress={() => handleRequest()}>
                    <PinButtonText
                      style={{
                        fontWeight: 500,
                        lineHeight: 15,
                        fontSize: 14,
                        color: '#fff',
                      }}>
                      {t('refund')}
                    </PinButtonText>
                  </WrapButton>
                ) : null}
              </Box>
            </HStack>
          </Box>
          <WrapDivider></WrapDivider>

          <Box mt={4}>
            <Para3Text>{t('wallet.modal.body.g')}</Para3Text>
            <HStack mt={4} alignItems='center'>
              <NumberText>
                {convertProperValue(refundedAmount.toBOAString(), 0)}{' '}
              </NumberText>
              <Para3Text pt={4} color='#12121D' style={{ fontWeight: 400 }}>
                Point
              </Para3Text>
            </HStack>
          </Box>
        </VStack>

        <Box mt={18} bg='white' rounded='$xl'>
          <HStack
            mt={20}
            mx={18}
            alignItems='center'
            justifyContent='space-between'>
            <Image
              h={18}
              w={87}
              alt='alt'
              source={require('../../assets/images/mykios.png')}
            />
            <WrapHistoryButton
              borderRadius='$full'
              h={24}
              pt={-2}
              onPress={() => navigation.navigate('DepositHistory')}>
              <Para2Text style={{ fontSize: 12, color: '#707070' }}>
                {t('user.wallet.link.deposit.history')}
              </Para2Text>
            </WrapHistoryButton>
          </HStack>
          <>
            <HStack justifyContent='center' pt={50}>
              <AppleSDGothicNeoSBText
                fontSize={40}
                lineHeight={48}
                fontWeight={400}>
                {convertProperValue(userTokenBalance.toBOAString())}
              </AppleSDGothicNeoSBText>
            </HStack>
            <VStack alignItems='center' pt={10}>
              <AppleSDGothicNeoSBText
                color='#555555'
                fontSize={16}
                lineHeight={22}
                fontWeight={400}>
                ≒{' '}
                {convertProperValue(
                  userTokenRate.toBOAString(),
                  userStore.currency.toLowerCase() ===
                    process.env.EXPO_PUBLIC_CURRENCY
                    ? 0
                    : 1,
                  userStore.currency.toLowerCase() ===
                    process.env.EXPO_PUBLIC_CURRENCY
                    ? 0
                    : 2,
                )}{' '}
                {userStore.currency.toUpperCase()}
              </AppleSDGothicNeoSBText>
              <AppleSDGothicNeoSBText
                color='#555555'
                fontSize={16}
                lineHeight={22}
                fontWeight={400}>
                (1 {t('token.name')} ≒{' '}
                {convertProperValue(
                  oneTokenRate.toBOAString(),
                  userStore.currency.toLowerCase() ===
                    process.env.EXPO_PUBLIC_CURRENCY
                    ? 0
                    : 1,
                  userStore.currency.toLowerCase() ===
                    process.env.EXPO_PUBLIC_CURRENCY
                    ? 0
                    : 5,
                )}{' '}
                {userStore.currency.toUpperCase()})
              </AppleSDGothicNeoSBText>

              <HStack py={20} px={20} flex={1} space='md'>
                <Box flex={1}>
                  <WrapButton
                    bg='black'
                    borderColor='#8A8A8A'
                    borderRadius='$lg'
                    borderWidth='$1'
                    onPress={() => goToDeposit('deposit')}>
                    <RobotoMediumText
                      style={{
                        fontWeight: 500,
                        lineHeight: 16,
                        fontSize: 15,
                        color: '#fff',
                      }}>
                      {t('deposit')}
                    </RobotoMediumText>
                  </WrapButton>
                </Box>
                <Box flex={1}>
                  <WrapButton
                    bg='black'
                    borderColor='#8A8A8A'
                    borderRadius='$lg'
                    borderWidth='$1'
                    onPress={() => goToDeposit('withdraw')}>
                    <RobotoMediumText
                      style={{
                        fontWeight: 500,
                        lineHeight: 16,
                        fontSize: 15,
                        color: '#fff',
                      }}>
                      {t('withdraw')}
                    </RobotoMediumText>
                  </WrapButton>
                </Box>
              </HStack>
            </VStack>
          </>
        </Box>

        <Box h={10}></Box>
      </ScrollView>
      <Box>
        <Modal
          isOpen={showModal}
          size='lg'
          onOpen={() => {
            formik.setFieldValue('n1', '');
          }}
          onClose={() => {
            setShowModal(false);
          }}>
          <ModalBackdrop />
          <ModalContent bg='#FFFFFF'>
            <ModalBody mt={30} mb={10} mx={10}>
              <VStack>
                <HeaderText>{t('user.wallet.link.convert')}</HeaderText>
                <ParaText mt={7}>
                  {t('user.wallet.modal.heading.description')}
                </ParaText>
                <ParaText mt={7}>{t('user.wallet.modal.body.a')}</ParaText>
              </VStack>

              <Box py={30}>
                <FormControl size='md' isInvalid={!!formik.errors.n1}>
                  <VStack space='xs'>
                    <HStack
                      alignItems='center'
                      justifyContent='space-between'
                      space='sm'>
                      <Input
                        flex={1}
                        mt={5}
                        style={{
                          height: 48,
                          borderWidth: 1,
                          borderColor: '#E4E4E4',
                        }}>
                        <InputField
                          style={{
                            fontFamily: 'Roboto-Medium',
                            lineHeight: 20,
                            fontSize: 19,
                            color: '#12121D',
                            textAlign: 'right',
                          }}
                          keyboardType='number-pad'
                          onChangeText={changeAmount}
                          onBlur={formik.handleBlur('n1')}
                          value={formik.values?.n1}
                        />
                      </Input>
                      <AppleSDGothicNeoSBText
                        w={50}
                        color='#555555'
                        fontSize={20}
                        lineHeight={22}
                        fontWeight={500}>
                        Point
                      </AppleSDGothicNeoSBText>
                    </HStack>
                    <HStack alignItems='center' justifyContent='flex-start'>
                      <RobotoRegularText
                        py={3}
                        fontSize={13}
                        lineHeight={18}
                        fontWeight={400}>
                        {' '}
                        {t('available')} :{' '}
                        {convertProperValue(refundableAmount.toBOAString(), 0)}
                      </RobotoRegularText>

                      <WrapHistoryButton
                        borderRadius='$full'
                        h={20}
                        ml={10}
                        onPress={takeMaxAmount}>
                        <Para2Text style={{ fontSize: 12, color: '#707070' }}>
                          {t('max')}
                        </Para2Text>
                      </WrapHistoryButton>
                    </HStack>

                    <HStack
                      mt={15}
                      alignItems='center'
                      justifyContent='space-between'>
                      <RobotoMediumText
                        fontSize={15}
                        fontWeight={500}
                        lightHeight={16}
                        color='#707070'>
                        {t('received.amount')} :
                      </RobotoMediumText>
                      <RobotoSemiBoldText>
                        {convertProperValue(receiveTokenAmount.toBOAString())}
                        {'     '} KIOS
                      </RobotoSemiBoldText>
                    </HStack>
                  </VStack>
                </FormControl>
              </Box>

              <HStack pt={20} flex={1}>
                <Box flex={1} mr={5}>
                  <WrapWhiteButton
                    onPress={() => {
                      setShowModal(false);
                    }}>
                    <ActiveWhiteButtonText>
                      {t('button.press.b')}
                    </ActiveWhiteButtonText>
                  </WrapWhiteButton>
                </Box>
                <Box flex={1} ml={5}>
                  <WrapButton
                    bg={ableToDo ? '#5C66D5' : '#E4E4E4'}
                    onPress={() => {
                      confirmModal();
                    }}>
                    <ActiveButtonText>{t('button.press.a')}</ActiveButtonText>
                  </WrapButton>
                </Box>
              </HStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>

      {/*<Box>*/}
      {/*  <Modal*/}
      {/*    isOpen={showModal}*/}
      {/*    size='lg'*/}
      {/*    onClose={() => {*/}
      {/*      setShowModal(false);*/}
      {/*    }}>*/}
      {/*    <ModalBackdrop />*/}
      {/*    <ModalContent bg='#FFFFFF'>*/}
      {/*      <ModalBody mt={30} mb={10} mx={10}>*/}
      {/*        <VStack>*/}
      {/*          <HeaderText>{modalHeader}</HeaderText>*/}
      {/*          <ParaText mt={7}>{modalContent}</ParaText>*/}
      {/*          <ParaText mt={7}>{t('wallet.modal.body.h')} </ParaText>*/}
      {/*        </VStack>*/}

      {/*        <HStack pt={20} flex={1}>*/}
      {/*          <Box flex={1} mr={5}>*/}
      {/*            <WrapWhiteButton*/}
      {/*              onPress={() => {*/}
      {/*                setShowModal(false);*/}
      {/*              }}>*/}
      {/*              <ActiveWhiteButtonText>*/}
      {/*                {t('button.press.b')}*/}
      {/*              </ActiveWhiteButtonText>*/}
      {/*            </WrapWhiteButton>*/}
      {/*          </Box>*/}
      {/*          <Box flex={1} ml={5}>*/}
      {/*            <WrapButton*/}
      {/*              onPress={() => {*/}
      {/*                setShowModal(false);*/}
      {/*                confirmModal();*/}
      {/*              }}>*/}
      {/*              <ActiveButtonText>{t('button.press.a')}</ActiveButtonText>*/}
      {/*            </WrapButton>*/}
      {/*          </Box>*/}
      {/*        </HStack>*/}
      {/*      </ModalBody>*/}
      {/*    </ModalContent>*/}
      {/*  </Modal>*/}
      {/*</Box>*/}
    </WrapBox>
  );
});
const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.7,
    lineHeight: 32,
    fontFamily: 'Roboto-Medium',
  },
});
export default Index;
