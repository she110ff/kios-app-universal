import { SafeAreaView } from 'react-native';
import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { Box, HStack, VStack } from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import '@ethersproject/shims';
import { Amount, NormalSteps } from 'kios-sdk-client-v2';
import {
  checkValidPeriod,
  convertProperValue,
  isEmpty,
} from '../../utils/convert';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { WrapBase2, WrapDivider } from '../../components/styled/layout';
import {
  ActiveButtonText,
  ActiveWhiteButtonText,
  RobotoMediumText,
  RobotoSemiBoldText,
} from '../../components/styled/text';
import { WrapButton, WrapWhiteButton } from '../../components/styled/button';
import RootPaddingBox2 from '../../components/RootPaddingBox2';

const MileageRedeemNotification = observer(({ navigation }) => {
  const { t } = useTranslation();
  const { pinStore, loyaltyStore, secretStore, userStore } = useStores();
  const [values, setValues] = useState(['T1', 'T2']);

  const [shopName, setShopName] = useState('');
  const [shopId, setShopId] = useState('');
  const [purchaseId, setPurchaseId] = useState('');
  const [amount, setAmount] = useState(new Amount(0, 18));
  const [useAmount, setUseAmount] = useState(new Amount(0, 18));
  const [currency, setCurrency] = useState('');
  const [hasPayment, setHasPayment] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    async function fetchClient() {
      try {
        if (
          loyaltyStore.payment &&
          !isEmpty(loyaltyStore.payment) &&
          loyaltyStore.payment.type === 'new'
        ) {
          if (
            checkValidPeriod(
              loyaltyStore.payment.timestamp,
              loyaltyStore.payment.timeout,
            )
          ) {
            setExpired(false);
          } else {
            setExpired(true);
            // alert(t('wallet.expired.alert'));
          }
          setHasPayment(true);
          await savePaymentInfo(secretStore.client, loyaltyStore.payment.id);
        } else {
          setHasPayment(false);
        }
      } catch (e) {
        alert('Redeem notification error :' + JSON.stringify(e.message));
      }
    }
    fetchClient().then();
  }, [loyaltyStore.payment]);
  const saveShopInfo = async (cc, shopId) => {
    // get shop info
    const info = await cc.shop.getShopInfo(shopId);
    console.log('shop info : ', info);
    setShopId(shopId);
    setShopName(info.name);
  };

  const savePaymentInfo = async (cc, paymentId) => {
    const info = await cc.ledger.getPaymentDetail(paymentId);
    console.log('payment info:', info);
    await Clipboard.setStringAsync(JSON.stringify(info));
    setPurchaseId(info.purchaseId);
    setAmount(new Amount(info.amount, 18));
    setCurrency(info.currency);
    setUseAmount(new Amount(info.paidPoint, 18));
    await saveShopInfo(cc, info.shopId);
  };

  async function confirmRedeem() {
    userStore.setLoading(true);
    try {
      const steps = [];

      // return;

      for await (const step of secretStore.client.ledger.approveNewPayment(
        loyaltyStore.payment.id,
        purchaseId,
        amount.value,
        currency.toLowerCase(),
        shopId,
        true,
      )) {
        steps.push(step);
        console.log('confirmRedeem step :', step);
        switch (step.key) {
          case NormalSteps.PREPARED:
            break;
          case NormalSteps.SENT:
            break;
          case NormalSteps.APPROVED:
            break;
          default:
            throw new Error(
              'Unexpected pay point step: ' + JSON.stringify(step, null, 2),
            );
        }
      }
      if (steps.length === 3 && steps[2].key === 'approved') {
        userStore.setLoading(false);
        const time = Math.round(+new Date() / 1000);
        loyaltyStore.setLastUpdateTime(time);
        loyaltyStore.setPayment({});
        pinStore.setNextScreen('Wallet');
        alert(t('wallet.redeem.use.done'));
      }
    } catch (e) {
      console.log('e :', e);
      userStore.setLoading(false);
      loyaltyStore.setPayment({});
      pinStore.setNextScreen('Wallet');
      alert(t('wallet.redeem.use.fail') + 'e:' + e.message);
    }
  }

  async function cancelRedeem() {
    loyaltyStore.setPayment({});
    pinStore.setNextScreen('Wallet');
  }

  return hasPayment ? (
    <>
      <RootPaddingBox2></RootPaddingBox2>
      <WrapBase2
        style={{ paddingTop: 35, backgroundColor: 'white' }}
        height='$full'>
        <MobileHeader
          title={t('wallet.redeem.header.title')}
          subTitle={t('wallet.redeem.header.subtitle')}
        />

        <VStack pt={50}>
          <WrapDivider mb={12}></WrapDivider>
          <HStack my={10} alignItems='center' justifyContent='space-between'>
            <RobotoMediumText
              fontSize={15}
              fontWeight={500}
              lightHeight={16}
              color='#707070'>
              {t('shop')} :
            </RobotoMediumText>
            <RobotoSemiBoldText>{shopName}</RobotoSemiBoldText>
          </HStack>
          <WrapDivider mb={12}></WrapDivider>
          <HStack my={10} alignItems='center' justifyContent='space-between'>
            <RobotoMediumText
              fontSize={15}
              fontWeight={500}
              lightHeight={16}
              color='#707070'>
              {t('purchase')} ID :
            </RobotoMediumText>
            <RobotoSemiBoldText>{purchaseId}</RobotoSemiBoldText>
          </HStack>
          <WrapDivider mb={12}></WrapDivider>
          <HStack my={10} alignItems='center' justifyContent='space-between'>
            <RobotoMediumText
              fontSize={15}
              fontWeight={500}
              lightHeight={16}
              color='#707070'>
              {t('purchase')} {t('amount')} :
            </RobotoMediumText>
            <RobotoSemiBoldText>
              {convertProperValue(amount.toBOAString())}{' '}
              {currency.toUpperCase()}
            </RobotoSemiBoldText>
          </HStack>
          <WrapDivider mb={12}></WrapDivider>
          <HStack my={10} alignItems='center' justifyContent='space-between'>
            <RobotoMediumText
              fontSize={15}
              fontWeight={500}
              lightHeight={16}
              color='#707070'>
              {t('wallet.redeem.header.body.a')} :
            </RobotoMediumText>
            <RobotoSemiBoldText>
              {convertProperValue(useAmount.toBOAString())} POINT
            </RobotoSemiBoldText>
          </HStack>
          <WrapDivider></WrapDivider>

          <HStack pt={20} flex={1}>
            {expired === true ? (
              <VStack flex={1} h={50}>
                <Box>
                  <RobotoSemiBoldText
                    fontSize={15}
                    fontWeight={500}
                    lightHeight={20}
                    color='red'>
                    {t('wallet.expired.alert')}
                  </RobotoSemiBoldText>
                </Box>
                <Box mt={3}>
                  <WrapButton onPress={() => cancelRedeem()}>
                    <ActiveButtonText>{t('button.press.c')}</ActiveButtonText>
                  </WrapButton>
                </Box>
              </VStack>
            ) : (
              <>
                <Box flex={1} mr={5}>
                  <WrapWhiteButton onPress={() => cancelRedeem()}>
                    <ActiveWhiteButtonText>
                      {t('button.press.b')}
                    </ActiveWhiteButtonText>
                  </WrapWhiteButton>
                </Box>
                <Box flex={1} ml={5}>
                  <WrapButton onPress={() => confirmRedeem()}>
                    <ActiveButtonText>{t('button.press.a')}</ActiveButtonText>
                  </WrapButton>
                </Box>
              </>
            )}
          </HStack>
        </VStack>
      </WrapBase2>
    </>
  ) : null;
});

export default MileageRedeemNotification;
