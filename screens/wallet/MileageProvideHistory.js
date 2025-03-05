import React, { useEffect, useState } from 'react';
import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import { Box, FlatList, HStack, Text, VStack } from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import { convertShopProperValue, timePadding } from '../../utils/convert';
import { Amount } from 'kios-sdk-client-v2';
import { BigNumber } from '@ethersproject/bignumber';
import { useTranslation } from 'react-i18next';
import { WrapBox, WrapDivider } from '../../components/styled/layout';
import { NumberText, Para3Text, ParaText } from '../../components/styled/text';

const MileageProvideHistory = observer(({ navigation }) => {
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
      const resEst = await secretStore.client.shop.getEstimatedProvideHistory(
        userStore.shopId,
      );
      console.log('resEst:', resEst);
      const scheduledHistory = resEst.map((it) => {
        return {
          id: it.timestamp + it.purchaseId,
          action: 0,
          increase: it.providedAmount,
          currency: it.currency,
          actionName: 'SCHEDULED',
          amount: it.providedAmount,
          blockTimestamp: it.timestamp,
        };
      });
      console.log('scheduledHistory:', scheduledHistory);
      const res = await secretStore.client.shop.getProvideAndUseTradeHistory(
        userStore.shopId,
        1,
        100,
      );

      console.log('len :', res.items?.length);
      console.log('res.shopTradeHistories 1:', res.items[0]);
      const tradeHistory = res.items
        .filter((it) => {
          return it.action === 1 || it.action === 2;
        })
        .map((it, idx) => {
          return {
            id: it.transactionHash + idx,
            action: it.action,
            increase: it.increase,
            currency: it.currency,
            actionName:
              it.action === 1
                ? 'PROVIDED'
                : it.cancel === false
                ? 'USED'
                : 'CANCEL',
            amount: it.action === 1 ? it.providedAmount : it.increase,
            blockTimestamp: it.blockTimestamp,
          };
        });

      const history = scheduledHistory.concat(tradeHistory);
      history.sort(function (a, b) {
        // 오름차순
        return a.blockTimestamp > b.blockTimestamp
          ? -1
          : a.blockTimestamp < b.blockTimestamp
          ? 1
          : 0;
      });
      console.log('history :', history.slice(0, 3));

      setHistoryData(history);
    };
    fetchHistory();
  }, []);

  return (
    <WrapBox
      style={{ paddingTop: 35, backgroundColor: userStore.contentColor }}>
      <MobileHeader
        title={t('wallet.history.header.title.provide')}
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Box>
              <VStack>
                <HStack
                  space='md'
                  alignItems='center'
                  justifyContent='space-between'>
                  <VStack>
                    <ParaText fontSize={14} fontWeight={400} lightHeight={20}>
                      {item.actionName === 'SCHEDULED'
                        ? t('wallet.history.body.text.e')
                        : item.actionName === 'CANCEL'
                        ? t('wallet.history.body.text.a')
                        : item.actionName === 'PROVIDED'
                        ? t('wallet.history.body.text.d')
                        : t('wallet.history.body.text.c')}
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
                      {item.actionName === 'USED' ? '+' : '-'}
                      {convertShopProperValue(
                        new Amount(
                          BigNumber.from(item.increase),
                          18,
                        ).toBOAString(),
                        item.currency,
                      )}{' '}
                    </NumberText>
                    <Para3Text
                      pt={4}
                      color='#12121D'
                      style={{ fontWeight: 400 }}>
                      {item.currency.toUpperCase()}
                    </Para3Text>
                  </HStack>
                </HStack>
                <WrapDivider mb={3}></WrapDivider>
              </VStack>
            </Box>
          )}
        />
      ) : null}
    </WrapBox>
  );
});

export default MileageProvideHistory;
