import {
  Input,
  InputField,
  FormControl,
  VStack,
  FormControlLabel,
  SelectInput,
  SelectTrigger,
  SelectIcon,
  Icon,
  SelectBackdrop,
  SelectPortal,
  SelectDragIndicatorWrapper,
  SelectContent,
  SelectItem,
  Select,
  SelectDragIndicator,
} from '@gluestack-ui/themed';
import { useFormik } from 'formik';
import * as yup from 'yup';
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import { AUTH_STATE } from '../../stores/user.store';
import { useStores } from '../../stores';
import '@ethersproject/shims';
import { ContractUtils, LoyaltyNetworkID } from 'kios-sdk-client-v2';
import * as Clipboard from 'expo-clipboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ChevronDownIcon } from 'lucide-react-native';
import MobileHeader from '../../components/MobileHeader';
import { useTranslation } from 'react-i18next';
import { WrapBox } from '../../components/styled/layout';
import { ActiveButtonText, SubHeaderText } from '../../components/styled/text';
import { WrapButton } from '../../components/styled/button';
import { activatePushNotification } from '../../utils/push.token';

const registerSchema = yup.object().shape({
  n1: yup.string().required(),
});

const registerInitialValues = {
  n1: '',
};

const ShopReg = observer(({ navigation }) => {
  const { t } = useTranslation();
  const { userStore, secretStore } = useStores();

  async function regShop() {
    userStore.setLoading(true);
    const steps = [];
    try {
      const shopId = ContractUtils.getShopId(
        secretStore.address,
        secretStore.network === 'testnet'
          ? LoyaltyNetworkID.ACC_TESTNET
          : LoyaltyNetworkID.ACC_MAINNET,
      );
      userStore.setShopId(shopId);
      userStore.setShopName(formik.values?.n1);
      const shopData = {
        shopId,
        name: formik.values?.n1,
        currency: userStore.currency,
      };
      for await (const step of secretStore.client.shop.add(
        shopData.shopId,
        shopData.name,
        shopData.currency,
      )) {
        steps.push(step);
        console.log('submit step :', step);
      }
      await activatePushNotification(
        t,
        secretStore,
        userStore,
        shopData.shopId,
      );
      alert(t('shop.alert.reg.done'));
      userStore.setLoading(false);
    } catch (e) {
      await Clipboard.setStringAsync(JSON.stringify(e));
      console.log('error : ', e);
      userStore.setLoading(false);
      alert(t('shop.alert.reg.fail'));
    }
  }

  const formik = useFormik({
    initialValues: registerInitialValues,
    validationSchema: registerSchema,

    onSubmit: (values, { resetForm }) => {
      regShop().then((r) => {
        userStore.setAuthState(AUTH_STATE.DONE);
      });
      resetForm();
    },
  });

  const onPressCurrency = (it) => {
    userStore.setCurrency(it);
  };
  return (
    <WrapBox style={{ backgroundColor: userStore.contentColor }}>
      <KeyboardAwareScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        scrollEnabled={true}
        extraScrollHeight={100}
        keyboardShouldPersistTaps='handled'
        scrollToOverflowEnabled={true}
        enableAutomaticScroll={true}>
        <MobileHeader
          title={t('shop.header.title')}
          subTitle={t('shop.header.subtitle')}></MobileHeader>

        <VStack mt={50}>
          <FormControl
            size='md'
            isRequired={true}
            isInvalid={!!formik.errors.n1}>
            <FormControlLabel mb='$1'>
              <SubHeaderText style={{ color: '#555555' }}>
                {t('shop.body.text.a')}
              </SubHeaderText>
            </FormControlLabel>
            <Input
              style={{
                height: 48,
                borderWidth: 1,
                borderColor: '#E4E4E4',
              }}>
              <InputField
                style={{
                  fontFamily: 'Roboto-Medium',
                  lineHeight: 20,
                  fontSize: 15,
                  color: '#12121D',
                }}
                type='text'
                placeholder={t('shop.body.text.a')}
                onChangeText={formik.handleChange('n1')}
                onBlur={formik.handleBlur('n1')}
                value={formik.values?.n1}
              />
            </Input>
          </FormControl>
          <FormControl size='md' isRequired={true} mt={15}>
            <FormControlLabel mb='$1'>
              <SubHeaderText style={{ color: '#555555' }}>
                {t('shop.body.text.b')}
              </SubHeaderText>
            </FormControlLabel>
            <Select
              onValueChange={onPressCurrency}
              selectedValue={userStore.currency}
              selectedLabel={userStore.currency.toUpperCase()}>
              <SelectTrigger
                style={{
                  height: 48,
                  borderWidth: 1,
                  borderColor: '#E4E4E4',
                }}>
                <SelectInput
                  placeholder='Select option'
                  style={{
                    fontFamily: 'Roboto-Medium',
                    lineHeight: 16,
                    fontSize: 15,
                    color: '#12121D',
                  }}
                />
                <SelectIcon mr='$3'>
                  <Icon as={ChevronDownIcon} />
                </SelectIcon>
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent h={300}>
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  <SelectItem
                    label={process.env.EXPO_PUBLIC_CURRENCY}
                    value={process.env.EXPO_PUBLIC_CURRENCY}
                    defaultValue={true}></SelectItem>
                  <SelectItem label='USD' value='usd' isDisabled={true} />
                </SelectContent>
              </SelectPortal>
            </Select>
          </FormControl>
          <WrapButton
            bg={formik.values?.n1 === '' ? '#E4E4E4' : '#5C66D5'}
            my='$4'
            isDisabled={formik.values?.n1 === ''}
            onPress={formik.handleSubmit}>
            <ActiveButtonText>{t('shop.create')}</ActiveButtonText>
          </WrapButton>
        </VStack>
      </KeyboardAwareScrollView>
    </WrapBox>
  );
});

export default ShopReg;
