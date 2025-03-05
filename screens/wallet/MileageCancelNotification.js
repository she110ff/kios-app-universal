import { SafeAreaView } from 'react-native';
import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonText,
  HStack,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import '@ethersproject/shims';
import { Amount, NormalSteps } from 'kios-sdk-client-v2';
import {
  checkValidPeriod,
  convertShopProperValue,
  isEmpty,
} from '../../utils/convert';
import { useTranslation } from 'react-i18next';
import {
  WrapBase2,
  WrapBox,
  WrapDivider,
} from '../../components/styled/layout';
import {
  ActiveButtonText,
  ActiveWhiteButtonText,
  NumberText,
  RobotoMediumText,
  RobotoSemiBoldText,
} from '../../components/styled/text';
import { WrapButton, WrapWhiteButton } from '../../components/styled/button';
import RootPaddingBox2 from '../../components/RootPaddingBox2';

const MileageCancelNotification = observer(() => {
  const { t } = useTranslation();
  const { pinStore, loyaltyStore, userStore, secretStore } = useStores();
  const [shopName, setShopName] = useState('');
  const [purchaseId, setPurchaseId] = useState('');
  const [amount, setAmount] = useState(new Amount(0, 18));
  const [currency, setCurrency] = useState('');
  const [hasPayment, setHasPayment] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    async function fetchClient() {
      try {
        if (
          loyaltyStore.payment &&
          !isEmpty(loyaltyStore.payment) &&
          loyaltyStore.payment.type === 'cancel'
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
          }
          setHasPayment(true);
          await savePaymentInfo(secretStore.client, loyaltyStore.payment.id);
        } else {
          setHasPayment(false);
        }
      } catch (e) {
        alert('shop notificaiton error :' + JSON.stringify(e.message));
      }
    }
    fetchClient().then();
  }, [loyaltyStore.payment]);
  const saveShopInfo = async (cc, shopId) => {
    // get shop info
    const info = await cc.shop.getShopInfo(shopId);
    setShopName(info.name);
  };

  const savePaymentInfo = async (cc, paymentId) => {
    try {
      const info = await cc.ledger.getPaymentDetail(paymentId);
      setPurchaseId(info.purchaseId);
      setAmount(new Amount(info.amount, 18));
      setCurrency(info.currency);
      await saveShopInfo(cc, info.shopId);
    } catch (e) {
      alert('store cancel notification error:' + JSON.stringify(e.message));
    }
  };

  async function confirmCancel() {
    if (expired) {
      loyaltyStore.setPayment({});
      pinStore.setNextScreen('Wallet');
      return;
    }
    userStore.setLoading(true);
    try {
      const steps = [];
      for await (const step of secretStore.client.ledger.approveCancelPayment(
        loyaltyStore.payment.id,
        purchaseId,
        true,
      )) {
        steps.push(step);
        console.log('confirmCancel step :', step);
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
        alert(t('wallet.cancel.use.done'));
      }
    } catch (e) {
      userStore.setLoading(false);
      console.log('e :', e);
      loyaltyStore.setPayment({});
      pinStore.setNextScreen('Wallet');
      alert(t('wallet.cancel.use.fail') + 'e:' + e.message);
    }
  }

  async function cancelCancel() {
    loyaltyStore.setPayment({});
    pinStore.setNextScreen('Wallet');
  }

  return hasPayment ? (
    <>
      <RootPaddingBox2></RootPaddingBox2>
      <WrapBase2
        style={{ paddingTop: 35, backgroundColor: userStore.contentColor }}
        height='$full'>
        <MobileHeader
          title={t('wallet.cancel.header.title')}
          subTitle={t('wallet.cancel.header.subtitle', {
            appName: t('app.name'),
          })}
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
            <NumberText>
              {convertShopProperValue(amount.toBOAString())}{' '}
              {currency.toUpperCase()}
            </NumberText>
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
                  <WrapButton onPress={() => cancelCancel()}>
                    <ActiveButtonText>{t('button.press.c')}</ActiveButtonText>
                  </WrapButton>
                </Box>
              </VStack>
            ) : (
              <>
                <Box flex={1} mr={5}>
                  <WrapWhiteButton onPress={() => cancelCancel()}>
                    <ActiveWhiteButtonText>
                      {t('button.press.b')}
                    </ActiveWhiteButtonText>
                  </WrapWhiteButton>
                </Box>
                <Box flex={1} ml={5}>
                  <WrapButton onPress={() => confirmCancel()}>
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

export default MileageCancelNotification;
