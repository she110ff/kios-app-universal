import React, { useEffect, useState } from 'react';
import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import { Box, FlatList, HStack, Text, VStack } from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import { convertShopProperValue, timePadding } from '../../utils/convert';
import { Amount, BOACoin } from 'kios-sdk-client-v2';
import { BigNumber } from '@ethersproject/bignumber';
import { useTranslation } from 'react-i18next';
import { WrapBox, WrapDivider } from '../../components/styled/layout';
import { NumberText, Para3Text, ParaText } from '../../components/styled/text';

const MileageAdjustmentHistory = observer(({ navigation }) => {
  const { t } = useTranslation();
  const { secretStore, userStore } = useStores();
  const [historyData, setHistoryData] = useState([]);
  function timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var months = [
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
    ];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time =
      year +
      '/' +
      month +
      '/' +
      timePadding(date) +
      ' ' +
      timePadding(hour) +
      ':' +
      timePadding(min) +
      ':' +
      timePadding(sec);
    return time;
  }
  console.log(timeConverter(0));
  useEffect(() => {
    const fetchHistory = async () => {
      const res = await secretStore.client.shop.getRefundHistory(
        userStore.shopId,
        1,
        100,
      );

      console.log('len :', res);
      console.log('len :', res.items?.length);
      const history = res.items
        .filter((it) => {
          return it.action === 3;
        })
        .map((it) => {
          return {
            id: it.id,
            action: it.action,
            increase: it.increase,
            actionName: 'REFUND',
            amount: it.increase,
            blockTimestamp: it.blockTimestamp,
            transactionHash: it.transactionHash,
          };
        });
      console.log('adjustment history :', history.slice(0, 3));

      setHistoryData(history);
    };
    fetchHistory();
  }, []);

  return (
    <WrapBox
      style={{ paddingTop: 35, backgroundColor: userStore.contentColor }}>
      <MobileHeader
        title={t('wallet.history.header.title.settlement')}
        subTitle={
          historyData && historyData.length > 0
            ? t('wallet.history.header.subtitle.a') +
              ' ' +
              historyData.length +
              ' ' +
              t('wallet.history.header.subtitle.b')
            : t('wallet.history.header.subtitle.nothing')
        }
      />
      {historyData && historyData.length > 0 ? (
        <FlatList
          mt={40}
          data={historyData}
          keyExtractor={(item) => item.transactionHash}
          renderItem={({ item }) => (
            <VStack>
              <HStack
                space='md'
                alignItems='center'
                justifyContent='space-between'>
                <VStack>
                  <ParaText fontSize={14} fontWeight={400} lightHeight={20}>
                    {item.actionName === 'OPEN_WITHDRAWN'
                      ? t('wallet.modal.body.e')
                      : t('wallet.modal.body.g')}
                  </ParaText>
                  <ParaText
                    fontSize={15}
                    fontWeight={500}
                    lightHeight={16}
                    color='#707070'>
                    {timeConverter(item.blockTimestamp)}
                  </ParaText>
                </VStack>
                <HStack alignItems='center' justifyContent='flex-end'>
                  <NumberText>
                    {convertShopProperValue(
                      new Amount(
                        BigNumber.from(item.increase),
                        18,
                      ).toBOAString(),
                    )}{' '}
                  </NumberText>
                  <Para3Text pt={4} color='#12121D' style={{ fontWeight: 400 }}>
                    {userStore.currency.toUpperCase()}
                  </Para3Text>
                </HStack>
              </HStack>
              <WrapDivider mb={3}></WrapDivider>
            </VStack>
          )}
        />
      ) : null}
    </WrapBox>
  );
});

export default MileageAdjustmentHistory;
