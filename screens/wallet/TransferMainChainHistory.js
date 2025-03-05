import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useStores } from '../../stores';
import { observer } from 'mobx-react';
import { Box, FlatList, HStack, Text, VStack } from '@gluestack-ui/themed';
import MobileHeader from '../../components/MobileHeader';
import {
  convertProperValue,
  timePadding,
  truncateMiddleString,
} from '../../utils/convert';
import { Amount, BOACoin, LedgerAction } from 'kios-sdk-client-v2';
import { BigNumber } from '@ethersproject/bignumber';
import { useTranslation } from 'react-i18next';
import { WrapBox, WrapDivider } from '../../components/styled/layout';
import { NumberText, Para3Text, ParaText } from '../../components/styled/text';

const TransferMainChainHistory = observer(({ navigation }) => {
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
      const resTransferHistory =
        await secretStore.client.ledger.getTransferHistoryInMainChain(
          secretStore.address,
        );
      console.log('resTransferHistory:', resTransferHistory);

      const history = resTransferHistory.items.map((it) => {
        return {
          id: it.blockTimestamp,
          from: it.from,
          to: it.to,
          value: it.value,
          blockTimestamp: it.blockTimestamp,
        };
      });

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
    fetchHistory()
      .then()
      .catch((e) => console.log('history error :', e));
  }, []);

  return (
    <WrapBox
      style={{ paddingTop: 35, backgroundColor: userStore.contentColor }}>
      <MobileHeader
        title={t('wallet.history.header.title.transfer')}
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
                    <ParaText
                      mb={2}
                      fontSize={15}
                      fontWeight={500}
                      lightHeight={16}
                      color='#707070'>
                      {timeConverter(item.blockTimestamp)}
                    </ParaText>
                    <ParaText fontSize={14} fontWeight={400} lightHeight={20}>
                      FROM : {truncateMiddleString(item.from || '', 16)}
                    </ParaText>
                    <ParaText fontSize={14} fontWeight={400} lightHeight={20}>
                      TO : {truncateMiddleString(item.to || '', 16)}
                    </ParaText>
                  </VStack>
                  <HStack alignItems='center' justifyContent='flex-end'>
                    <NumberText>
                      {convertProperValue(
                        new Amount(
                          BigNumber.from(item.value),
                          18,
                        ).toBOAString(),
                        1,
                      )}{' '}
                    </NumberText>
                    <Para3Text
                      pt={4}
                      color='#12121D'
                      style={{ fontWeight: 400 }}>
                      KIOS
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

export default TransferMainChainHistory;
