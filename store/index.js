import Dash from 'dash'
import Vue from 'vue'

console.log('process.env:>> ', process.env)

let client, clientInitFinished

const getInitState = () => {
  return {
    snackbar: { show: false, color: 'red', text: '', timestamp: 0, link: null },
    dppCache: {},
    myUserName: '',
    dpns: {},
  }
}
export const state = () => getInitState()

export const getters = {
  getMyUsername(state) {
    return state.myUserName
  },
  getDocumentById: (state) => (docId) => {
    if (!docId) return null

    return state.dppCache[docId]
  },
}

export const mutations = {
  setMyUsername(state, userName) {
    state.myUserName = userName
  },
  setSnackBar(state, { text, color = 'red', link = null }) {
    state.snackbar.text = text
    state.snackbar.color = color
    state.snackbar.link = link
    state.snackbar.show = true
    state.snackbar.timestamp = Date.now()
  },
  setDppCache(state, { typeLocator, documents }) {
    // const [app, docType] = typeLocator.split('.')

    console.log('setting cache documents :>> ', documents)

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i].toJSON()

      console.log('document :>> ', document)

      Vue.set(state.dppCache, `${document.$id}`, document)
    }
  },
}

export const actions = {
  async fetchUsernameByOwnerId({ commit, state }, ownerId) {
    if (state.dpns[ownerId]) return

    const [usernameDoc] = await client.platform.names.resolveByRecord(
      'dashUniqueIdentityId',
      ownerId
    )

    console.log('usernameDoc :>> ', ownerId, usernameDoc)

    if (usernameDoc) commit('setDpns', usernameDoc.toJSON())
    return usernameDoc
  },
  showSnackbar({ commit }, snackbar) {
    commit('setSnackBar', snackbar)
  },
  async isClientReady() {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!clientInitFinished) {
      console.log('client not ready')
      await this.$sleep(250)
    }
    if (client.wallet)
      client.account = await client.wallet.getAccount({ index: 0 })
  },
  async initWallet({ dispatch, commit, state }, { mnemonic }) {
    clientInitFinished = false
    console.log('Initializing Dash.Client with mnemonic: ', mnemonic)

    let clientOpts = {
      network: 'testnet',
      unsafeOptions: {
        skipSynchronizationBeforeHeight: 485512,
      },
      passFakeAssetLockProofForTests: process.env.LOCALNODE,
      dapiAddresses: process.env.DAPIADDRESSES,
      wallet: typeof mnemonic !== 'undefined' ? { mnemonic } : undefined,
      apps: {
        dpns: process.env.DPNS,
        example: {
          contractId: process.env.example_CONTRACT_ID,
        },
      },
    }

    // Remove undefined keys
    clientOpts = JSON.parse(JSON.stringify(clientOpts))

    console.dir({ clientOpts }, { depth: 100 })

    client = new Dash.Client(clientOpts)

    console.log('client.wallet :>> ', client.wallet)

    Object.entries(client.getApps().apps).forEach(([name, entry]) =>
      console.log(name, entry.contractId.toString())
    )

    if (client.wallet) {
      client.account = await client.wallet.getAccount({ index: 0 })

      console.log(
        'init Funding address',
        client.account.getUnusedAddress().address
      )
      console.log('init total Balance', client.account.getTotalBalance())

      // An account without identity can't submit documents, so let's create one
      // if (!client.account.identities.getIdentityIds().length)
      console.log('Registering identity...')

      const identity = await client.platform.identities.register()

      console.log('identity registered :>> ', identity)
    } else {
      console.log(
        'Initialized client without a wallet, you can fetch documents but not create documents, identities or names !!'
      )
    }
    const identityId = client.account.identities.getIdentityIds()[0]

    const userNameDoc = await dispatch('fetchUsernameByOwnerId', identityId)

    const userName = userNameDoc
      ? userNameDoc.label
      : '#' + identityId.substr(0, 5)

    commit('setMyUsername', userName)

    clientInitFinished = true
  },
  async submitDocument({ commit, dispatch }, { typeLocator, doc }) {
    console.log(`submitDocument to ${typeLocator}`, doc)

    const { platform } = client

    try {
      const identityId = client.account.identities.getIdentityIds()[0]

      const getStart = Date.now()

      const identity = await platform.identities.get(identityId)

      console.log(
        'Get identity finished in: ',
        Math.floor(Date.now() - getStart) / 1000
      )

      // Create the document
      const document = await platform.documents.create(
        typeLocator,
        identity,
        doc
      )

      console.log('created document :>> ', document)

      const documentBatch = {
        create: [document],
        replace: [],
        delete: [],
      }

      const result = await platform.documents.broadcast(documentBatch, identity)

      console.log(`submitDocument result: ${typeLocator} :>> `, result)

      commit('setDppCache', { typeLocator, documents: result.transitions })

      return result
    } catch (e) {
      dispatch('showSnackbar', { text: e.message })
      console.error('Something went wrong:', e)
    }
  },
  async fetchDocumentById({ dispatch, commit }, { typeLocator, docId }) {
    const queryOpts = {
      limit: 1,
      startAt: 1,
      where: [['$id', '==', docId]],
    }

    console.log(
      `fetchDocumentById ${typeLocator}`,
      client.getApps().get(typeLocator.split('.')[0]).contractId.toString(),
      queryOpts
    )

    try {
      const [document] = await client.platform.documents.get(
        `${typeLocator}`,
        queryOpts
      )
      console.log(
        `fetched DocumentById ${typeLocator}`,
        { queryOpts },
        document
      )
      commit('setDppCache', { typeLocator, documents: [document] })
      return document
    } catch (e) {
      console.error(
        'Something went wrong:',
        'fetchDocuments()',
        {
          typeLocator,
          queryOpts,
        },
        e
      )
      dispatch('showSnackbar', { text: e, color: 'red' })
    }
  },
  async fetchDocuments(
    { dispatch, commit },
    {
      typeLocator,
      queryOpts = {
        limit: 1,
        startAt: 1,
      },
    }
  ) {
    console.log(
      `fetchDocuments ${typeLocator}`,
      client.getApps().get(typeLocator.split('.')[0]).contractId.toString(),
      queryOpts
    )

    try {
      const documents = await client.platform.documents.get(
        `${typeLocator}`,
        queryOpts
      )
      console.log(`fetched Documents ${typeLocator}`, { queryOpts }, documents)
      commit('setDppCache', { typeLocator, documents })
      return documents
    } catch (e) {
      console.error(
        'Something went wrong:',
        'fetchDocuments()',
        {
          typeLocator,
          queryOpts,
        },
        e
      )
      dispatch('showSnackbar', { text: e, color: 'red' })
    }
  },
}
