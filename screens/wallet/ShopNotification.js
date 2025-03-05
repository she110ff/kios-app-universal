import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { Box, HStack, VStack } from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import '@ethersproject/shims';
import { NormalSteps } from 'kios-sdk-client-v2';
import { useTranslation } from 'react-i18next';
import { checkValidPeriod, isEmpty } from '../../utils/convert';
import { WrapBase2, WrapDivider } from '../../components/styled/layout';
import {
  ActiveButtonText,
  ActiveWhiteButtonText,
  RobotoMediumText,
  RobotoSemiBoldText,
} from '../../components/styled/text';
import { WrapButton, WrapWhiteButton } from '../../components/styled/button';
import RootPaddingBox2 from '../../components/RootPaddingBox2';

const ShopNotification = observer(() => {
  const { t } = useTranslation();
  const { loyaltyStore, userStore, pinStore, secretStore } = useStores();
  const [shopName, setShopName] = useState('');
  const [shopId, setShopId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [currency, setCurrency] = useState('');
  const [hasPayment, setHasPayment] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    async function fetchClient() {
      try {
        if (
          loyaltyStore.payment &&
          !isEmpty(loyaltyStore.payment) &&
          loyaltyStore.payment.type === 'shop_update'
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
          setTaskId(loyaltyStore.payment.taskId);
          await saveTaskInfo(secretStore.client, loyaltyStore.payment.taskId);
        } else {
          setHasPayment(false);
        }
      } catch (e) {
        console.log('shop notificaiton error :' + JSON.stringify(e));
      }
    }
    fetchClient().then();

    // initiateTimer();
  }, [loyaltyStore.payment]);

  const saveTaskInfo = async (cc, tId) => {
    const task = await cc.shop.getTaskDetail(tId);
    setShopId(task.shopId.toString());
    setShopName(task.name);
    setCurrency(task.currency);
  };

  async function confirmUpdate() {
    if (expired) {
      loyaltyStore.setPayment({});
      pinStore.setNextScreen('Wallet');
      return;
    }
    userStore.setLoading(true);
    try {
      const steps = [];
      for await (const step of secretStore.client.shop.approveUpdate(
        taskId,
        shopId,
        true,
      )) {
        steps.push(step);
        console.log('confirmUpdate step :', step);
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
        userStore.setCurrency(currency.toUpperCase());
        userStore.setShopName(shopName);
        loyaltyStore.setPayment({});
        pinStore.setNextScreen('Wallet');
        alert(t('wallet.shop.update.done'));
      }
    } catch (e) {
      userStore.setLoading(false);
      console.log('e :', e);
      loyaltyStore.setPayment({});
      pinStore.setNextScreen('Wallet');
      alert(t('wallet.shop.update.fail') + 'e:' + JSON.stringify(e.message));
    }
  }
  async function cancelUpdate() {
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
          title={t('wallet.shop.update.header.title')}
          subTitle={t('wallet.shop.update.header.subtitle')}
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
              {t('shop.body.text.b')} :
            </RobotoMediumText>
            <RobotoSemiBoldText>{currency.toUpperCase()}</RobotoSemiBoldText>
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
                  <WrapButton onPress={() => cancelUpdate()}>
                    <ActiveButtonText>{t('button.press.c')}</ActiveButtonText>
                  </WrapButton>
                </Box>
              </VStack>
            ) : (
              <>
                <Box flex={1} mr={5}>
                  <WrapWhiteButton onPress={() => cancelUpdate()}>
                    <ActiveWhiteButtonText>
                      {t('button.press.b')}
                    </ActiveWhiteButtonText>
                  </WrapWhiteButton>
                </Box>
                <Box flex={1} ml={5}>
                  <WrapButton onPress={() => confirmUpdate()}>
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

export default ShopNotification;
