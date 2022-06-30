import { acceptHMRUpdate, defineStore } from 'pinia'
import Dash from 'dash'

const clientOpts = { dapiAddresses: ['127.0.0.1:3000'] }

const client = new Dash.Client(clientOpts)

const connect = new dashDappConnect()

export const useConnectStore = defineStore('connect', () => {
  const me = reactive({ dpns: {}, label: '', balance: 0 })

  const connectWallet = async () => {
    const data = await connect.connect()

    me.dpns = data.payload
    me.label = me.dpns.label

    me.balance = (await connect.getConfirmedBalance()).payload
  }

  return {
    connect,
    client,
    connectWallet,
    me,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useConnectStore, import.meta.hot))
