import Dash from 'dash'
import Vue from 'vue'

console.log('process.env:>> ', process.env)

let client, clientInitFinished

const getInitState = () => {
  return {
    snackbar: { show: false, color: 'red', text: '', timestamp: 0, link: null },
    dppCache: {},
    myUserName: '',
    dpnsCache: {},
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
  getUsernameByOwnerId: (state) => (ownerId) => {
    console.log('getUserNameByOwnerId ownerId :>> ', ownerId)
    if (!ownerId) return null

    return state.dpnsCache[ownerId] ? state.dpnsCache[ownerId].label : ownerId
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
      const document = documents[i]

      console.log('document :>> ', document)

      Vue.set(state.dppCache, `${document.$id}`, document)
    }
  },
  setDpnsCache(state, usernameDoc) {
    Vue.set(state.dpnsCache, `${usernameDoc.$ownerId}`, usernameDoc)
  },
}

export const actions = {
  async fetchUsernameByOwnerId({ commit, state }, ownerId) {
    if (state.dpnsCache[ownerId]) return

    const [usernameDoc] = await client.platform.names.resolveByRecord(
      'dashUniqueIdentityId',
      ownerId
    )

    console.log('usernameDoc :>> ', ownerId, usernameDoc)

    if (usernameDoc) commit('setDpnsCache', usernameDoc.toJSON())

    return usernameDoc ? usernameDoc.toJSON() : undefined
    // return undefined
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
  },
  initWallet({ dispatch, commit, state }) {
    clientInitFinished = false

    let clientOpts = {
      passFakeAssetLockProofForTests: process.env.LOCALNODE,
      dapiAddresses: process.env.DAPIADDRESSES,
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

    Object.entries(client.getApps().apps).forEach(([name, entry]) =>
      console.log(name, entry.contractId.toString())
    )

    clientInitFinished = true
  },
  async submitDocument({ commit, dispatch }, { typeLocator, doc }) {
    console.log(`submitDocument to ${typeLocator}`, doc)

    const { platform } = client

    try {
      const identityId = client.account.getIdentityIds()[0]

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
    console.log('docId :>> ', docId)
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
      if (document) {
        commit('setDppCache', { typeLocator, documents: [document.toJSON()] })

        dispatch('fetchUsernameByOwnerId', document.toJSON().$ownerId)
      }
      return document ? document.toJSON() : undefined
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
      const documents = (
        await client.platform.documents.get(`${typeLocator}`, queryOpts)
      ).map((doc) => doc.toJSON())

      console.log(`fetched Documents ${typeLocator}`, { queryOpts }, documents)

      commit('setDppCache', { typeLocator, documents })

      documents.forEach((document) => {
        console.log(
          'document ownerId fetchDocuments fetchUsername :>> ',
          document.$ownerId
        )
        dispatch('fetchUsernameByOwnerId', document.$ownerId)
      })

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
