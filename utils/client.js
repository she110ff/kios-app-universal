import { getSecureValue } from './secure.store';
import { LIVE_CONTRACTS, SupportedNetwork } from 'kios-sdk-client-v2';
import '@ethersproject/shims';
import { Wallet } from '@ethersproject/wallet';
global.XMLHttpRequest = require('xhr2');

import {
  Client,
  Context,
  ContextBuilder,
  ContextParams,
} from 'kios-sdk-client-v2';
export async function getClient(screen = 'unknown', network = 'testnet') {
  async function fetchKey() {
    let pKey = await getSecureValue('privateKey');
    if (pKey.includes('0x')) {
      // pKey = pKey.split('0x')[1];
      console.log(screen, ' client pKey :', pKey);
    }
    const address = await getSecureValue('address');

    return { pKey, address };
  }
  const { pKey, address } = await fetchKey();
  async function createClient(privateKey) {
    console.log('createClient > env network :', network);
    try {
      const contextParams =
        network === 'testnet'
          ? ContextBuilder.buildContextParamsOfTestnet(privateKey)
          : ContextBuilder.buildContextParamsOfMainnet(privateKey);
      console.log(JSON.stringify(contextParams));

      const context =
        network === 'testnet'
          ? ContextBuilder.buildContextOfTestnet(privateKey)
          : ContextBuilder.buildContextOfMainnet(privateKey);

      const client = new Client(context);

      return client;
    } catch (e) {
      console.log('c e :', e);
    }
  }
  const client = await createClient(pKey);
  console.log('Client > client :', client);
  console.log('Client > address :', address);
  return { client, address };
}
