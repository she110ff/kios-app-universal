import React, { useEffect, useState } from 'react';
import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import {
  Box,
  FormControl,
  HStack,
  Input,
  InputField,
  VStack,
} from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import {
  greaterFloatTexts,
  convertProperValue,
  subFloatTexts,
  validateNumberWithDecimal,
  greaterAndEqualFloatTexts,
} from '../../utils/convert';
import { Amount, BOACoin, NormalSteps } from 'kios-sdk-client-v2';
import { useTranslation } from 'react-i18next';
import { WrapBox, WrapDivider } from '../../components/styled/layout';
import {
  ActiveButtonText,
  AppleSDGothicNeoSBText,
  Para2Text,
  ParaText,
  RobotoMediumText,
  RobotoRegularText,
  RobotoSemiBoldText,
} from '../../components/styled/text';
import DepositTabs from '../../components/DepositTab';
import { MaterialIcons } from '@expo/vector-icons';
import { WrapButton, WrapHistoryButton } from '../../components/styled/button';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { WithLocalSvg } from 'react-native-svg/css';

import bs from '../../assets/images/bosagora.svg';
import * as Clipboard from 'expo-clipboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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
const Deposit = observer(({ navigation }) => {
  const { t } = useTranslation();
  const { secretStore, userStore } = useStores();
  const [balanceMainChain, setBalanceMainChain] = useState(new BOACoin(0));
  const [balanceSideChain, setBalanceSideChain] = useState(new BOACoin(0));
  const [sideChainFee, setSideChainFee] = useState(new BOACoin(0));
  const [mainChainFee, setMainChainFee] = useState(new BOACoin(0));
  const [ableToDo, setAbleToDo] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState(0);

  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [currency, setCurrency] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      const summary = await secretStore.client.ledger.getSummary(
        secretStore.address,
      );
      setTokenName(summary.tokenInfo.name);
      setTokenSymbol(summary.tokenInfo.symbol);
      setCurrency(summary.exchangeRate.currency.symbol);

      const balanceMainChainConv = new BOACoin(summary.mainChain.token.balance);
      setBalanceMainChain(balanceMainChainConv);

      const balanceSideChainConv = new BOACoin(summary.ledger.token.balance);
      setBalanceSideChain(balanceSideChainConv);
      const sideChainFee1 = new BOACoin(summary.protocolFees.deposit);
      const mainChainFee1 = new BOACoin(summary.protocolFees.deposit);

      setSideChainFee(sideChainFee1);
      setMainChainFee(mainChainFee1);
    };
    fetchHistory();
  }, []);

  const formik = useFormik({
    initialValues: registerInitialValues,
    validationSchema: registerSchema,

    onSubmit: (values, { resetForm }) => {
      console.log('form values :', values);
      if (!ableToDo) return;
      if (userStore.isDeposit)
        doDeposit().then((v) => navigation.navigate('Wallet'));
      else doWithdraw().then((v) => navigation.navigate('Wallet'));
      resetForm();
    },
  });

  async function doDeposit() {
    try {
      userStore.setLoading(true);
      const amount = Amount.make(formik.values.n1, 18).value;
      let depositId = '';
      const steps = [];
      for await (const step of secretStore.client.ledger.depositViaBridge(
        amount,
      )) {
        console.log('deposit step :', step);
        steps.push(step);
        if (step.key === NormalSteps.DONE) depositId = step.depositId;
      }
      const waitSteps = [];
      console.log('depositId : ', depositId);
      if (steps.length === 3 && steps[2].key === 'done') {
        for await (const waitStep of secretStore.client.ledger.waiteDepositViaBridge(
          depositId,
          60,
        )) {
          console.log('waitDeposit step :', waitStep);
          waitSteps.push(waitStep);
        }
      }
      userStore.setLoading(false);
    } catch (e) {
      await Clipboard.setStringAsync(JSON.stringify(e));
      console.log('error : ', e);
      userStore.setLoading(false);
      alert(t('user.wallet.alert.deposit.fail') + JSON.stringify(e.message));
    }
  }

  async function doWithdraw() {
    try {
      userStore.setLoading(true);
      const amount = Amount.make(formik.values.n1, 18).value;
      let depositId = '';
      const steps = [];
      for await (const step of secretStore.client.ledger.withdrawViaBridge(
        amount,
      )) {
        console.log('withdraw step :', step);
        steps.push(step);
        if (step.key === NormalSteps.DONE) depositId = step.depositId;
      }
      const waitSteps = [];
      console.log('depositId : ', depositId);
      if (steps.length === 3 && steps[2].key === 'done') {
        for await (const waitStep of secretStore.client.ledger.waiteWithdrawViaBridge(
          depositId,
          60,
        )) {
          console.log('wait step :', waitStep);
          waitSteps.push(waitStep);
        }
      }
      userStore.setLoading(false);
    } catch (e) {
      await Clipboard.setStringAsync(JSON.stringify(e));
      console.log('error : ', e);
      userStore.setLoading(false);
      alert(t('user.wallet.alert.withdraw.fail') + JSON.stringify(e.message));
    }
  }

  const takeMaxAmount = () => {
    // console.log('max :', convertProperValue(balanceMainChain.toBOAString()));
    // const vv = convertProperValue(balanceMainChain.toBOAString())

    const balance = userStore.isDeposit
      ? balanceMainChain.toBOAString()
      : balanceSideChain.toBOAString();
    console.log('max :', convertProperValue(balance));
    const vv = convertProperValue(balance).split(',').join('');
    changeAmount(vv);
  };

  const changeAmount = (v) => {
    console.log('change value :', v);
    console.log('change include comma :', v.includes(','));
    const vv = v.includes(',') ? v.split(',').join('') : v;
    console.log('1');
    formik.setFieldValue('n1', vv);
    console.log('2');
    const fee = userStore.isDeposit ? mainChainFee : sideChainFee;
    console.log('3');
    const balance = userStore.isDeposit
      ? balanceMainChain.toBOAString()
      : balanceSideChain.toBOAString();
    console.log('balance :', balance);
    console.log('sideChainFee.toBOAString() :', sideChainFee.toBOAString());
    if (
      validateNumberWithDecimal(vv) &&
      greaterFloatTexts(vv, sideChainFee.toBOAString()) &&
      greaterAndEqualFloatTexts(balance, vv)
    ) {
      setAbleToDo(true);
      const aa = subFloatTexts(vv, fee.toBOAString());
      setReceiveAmount(aa);
    } else {
      setAbleToDo(false);
      setReceiveAmount('0');
    }
  };

  return (
    <WrapBox
      style={{ paddingTop: 35, backgroundColor: userStore.contentColor }}>
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
          title={
            process.env.EXPO_PUBLIC_APP_KIND === 'user'
              ? t('Deposit / Withdraw')
              : 'Withdraw'
          }
          subTitle=''
        />
        {process.env.EXPO_PUBLIC_APP_KIND === 'user' ? (
          <DepositTabs userStore={userStore} />
        ) : null}
        <Box mt={20} w='$full'>
          <Box bg='white' rounded='$sm'>
            <VStack>
              <HStack
                space='md'
                alignItems='center'
                justifyContent='flex-start'>
                <HStack space='sm' alignItems='center'>
                  <WithLocalSvg
                    width={20}
                    height={20}
                    fill={'#000000'}
                    asset={bs}
                  />

                  <VStack>
                    <ParaText
                      fontSize={13}
                      fontWeight={500}
                      lightHeight={16}
                      color='#000000'>
                      From
                    </ParaText>
                    <ParaText fontSize={11} fontWeight={400} lightHeight={20}>
                      {userStore.isDeposit ? 'BosAgora' : 'Ledger'}
                    </ParaText>
                  </VStack>
                </HStack>
                <HStack space='md' alignItems='center' justifyContent='center'>
                  <MaterialIcons
                    name='arrow-forward-ios'
                    size={20}
                    color='#8A8A8A'
                  />
                </HStack>
                <HStack space='sm' alignItems='center'>
                  <WithLocalSvg
                    width={20}
                    height={20}
                    fill={'#000000'}
                    asset={bs}
                  />

                  <VStack>
                    <ParaText
                      fontSize={13}
                      fontWeight={500}
                      lightHeight={16}
                      color='#000000'>
                      To
                    </ParaText>
                    <ParaText fontSize={11} fontWeight={400} lightHeight={20}>
                      {userStore.isDeposit ? 'Ledger' : 'BosAgora'}
                    </ParaText>
                  </VStack>
                </HStack>
              </HStack>
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
                          // returnKeyLabel='Done'
                          // returnKeyType='done'
                          keyboardType='decimal-pad'
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
                        {tokenSymbol}
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
                        {convertProperValue(
                          userStore.isDeposit
                            ? balanceMainChain.toBOAString()
                            : balanceSideChain.toBOAString(),
                        )}
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
                  </VStack>
                </FormControl>
              </Box>

              <WrapDivider my={2}></WrapDivider>
              <HStack
                my={10}
                alignItems='center'
                justifyContent='space-between'>
                <RobotoMediumText
                  fontSize={15}
                  fontWeight={500}
                  lightHeight={16}
                  color='#707070'>
                  {t('received.amount')} :
                </RobotoMediumText>
                <RobotoSemiBoldText>{receiveAmount}</RobotoSemiBoldText>
              </HStack>
              <WrapDivider my={2}></WrapDivider>
              <HStack
                my={10}
                alignItems='center'
                justifyContent='space-between'>
                <RobotoMediumText
                  fontSize={15}
                  fontWeight={500}
                  lightHeight={16}
                  color='#707070'>
                  {t('fee')} :
                </RobotoMediumText>
                <RobotoSemiBoldText>
                  {convertProperValue(sideChainFee.toBOAString())}
                </RobotoSemiBoldText>
              </HStack>
              <WrapDivider></WrapDivider>

              <WrapButton
                // isDisabled={formik.isValid}
                bg={ableToDo ? '#5C66D5' : '#E4E4E4'}
                onPress={formik.handleSubmit}
                my='$4'>
                <ActiveButtonText>{t('button.press.a')}</ActiveButtonText>
              </WrapButton>
            </VStack>
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </WrapBox>
  );
});

export default Deposit;
