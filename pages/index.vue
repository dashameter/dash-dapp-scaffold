<template>
  <v-row>
    <v-col cols="10" class="mx-auto">
      <v-card v-if="error">
        <v-card-title>
          {{ error }}
        </v-card-title>
      </v-card>
      <v-card class="mb-10">
        <v-card-text class="mb-0 pb-0">Dash User </v-card-text>
        <v-card-title>{{
          accountDPNS ? accountDPNS.label : connectedState
        }}</v-card-title>
        <v-card-subtitle>Balance: {{ confirmedBalance }}</v-card-subtitle>
        <v-card-subtitle>Address: {{ unusedAddress }}</v-card-subtitle>
        <v-card-actions>
          <v-btn color="primary" @click="DashConnect">connect wallet</v-btn>
          <v-btn
            color="primary"
            @click="getConfirmedBalance"
            :disabled="!accountDPNS"
            >Read Balance</v-btn
          >
          <v-btn
            color="primary"
            :disabled="!accountDPNS"
            @click="getUnusedAddress"
            >Get Address</v-btn
          >
        </v-card-actions>
      </v-card>
      <v-card class="mb-10">
        <v-card-text class="mb-0 pb-0">Write a message</v-card-text>
        <v-text-field v-model="message" />
        <v-card-subtitle>
          <v-icon :color="verified ? 'green' : 'red'">{{
            verified ? 'mdi-check-bold' : 'mdi-close-thick'
          }}</v-icon>

          Signature: {{ signature }}
        </v-card-subtitle>
        <v-card-subtitle>Encrypted: {{ encrypted }}</v-card-subtitle>
        <v-card-subtitle>Decrypted: {{ decrypted }}</v-card-subtitle>
        <v-card-actions>
          <v-btn
            :disabled="!accountDPNS"
            :loading="broadcastState === 'sending'"
            color="secondary"
            @click="sendMessage"
            >Send Message</v-btn
          >
          <v-btn :disabled="!accountDPNS" color="secondary" @click="signMessage"
            >Sign / Verify</v-btn
          >
          <v-btn
            :disabled="!accountDPNS"
            color="secondary"
            @click="encryptMessage"
            >Encrypt
          </v-btn>
          <v-btn
            :disabled="!accountDPNS"
            color="secondary"
            @click="decryptMessage"
            >Decrypt</v-btn
          >
        </v-card-actions>
      </v-card>
      <v-card class="mb-10">
        <v-list dense>
          <v-subheader>Status</v-subheader>
          <v-list-item-group color="primary">
            <v-list-item v-for="(step, idx) in steps" :key="idx">
              <v-list-item-icon v-if="currentStep === idx">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="16"
                  width="2"
                ></v-progress-circular>
              </v-list-item-icon>
              <v-list-item-icon v-else-if="currentStep < idx">
                <v-icon>mdi-clock-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-icon v-else-if="currentStep > idx">
                <v-icon color="green">mdi-check-bold</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-text="step" />
              </v-list-item-content>
            </v-list-item>
            <v-list-item>
              <v-list-item-icon v-if="connectedState === 'connecting'">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="16"
                  width="2"
                ></v-progress-circular>
              </v-list-item-icon>
              <v-list-item-icon v-else-if="connectedState === 'disconnected'">
                <v-icon>mdi-clock-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-icon v-else-if="connectedState === 'connected'">
                <v-icon color="green">mdi-check-bold</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Connect Wallet</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item>
              <v-list-item-icon v-if="broadcastState === 'sending'">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="16"
                  width="2"
                ></v-progress-circular>
              </v-list-item-icon>
              <v-list-item-icon v-else-if="broadcastState === null">
                <v-icon>mdi-clock-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-icon v-else-if="broadcastState === 'sent'">
                <v-icon color="green">mdi-check-bold</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Submit Document</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card>
      <v-card class="mb-10">
        <v-card-title> Documents fetched from dpp: </v-card-title>
        <v-card v-for="(doc, idx) in docs" :key="idx">
          <v-card-text class="mb-0 pb-0"
            >{{ getUsernameByOwnerId(doc.$ownerId) }}
          </v-card-text>
          <v-card-title>{{ doc.message }}</v-card-title>
        </v-card>
      </v-card>
      <v-card>
        <v-card-title> Document read from cache: </v-card-title>
        <pre>
        {{ JSON.stringify(getDocumentById(docId), null, ' ') }}
      </pre
        >
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'
import DashDappConnect from 'dash-dapp-connect'
// const DashDappConnect = require('dash-dapp-connect')

const Connect = new DashDappConnect()

export default {
  components: {},
  data() {
    return {
      connectedState: 'disconnected',
      broadcastState: null,
      message: '',
      signature: '',
      verified: false,
      encrypted: '',
      decrypted: '',
      accountDPNS: null,
      confirmedBalance: 0,
      unusedAddress: '',
      steps: [
        'Connect to Dash Platform',
        'Fetch Documents',
        // 'Connect Wallet',
        // 'Submit Document',
        // 'Fetch Document By Id',
      ],
      currentStep: 0,
      docId: '',
      docs: [],
      error: null,
    }
  },
  computed: {
    ...mapGetters(['getDocumentById', 'getMyUsername', 'getUsernameByOwnerId']),
  },
  mounted() {},
  async created() {
    try {
      // 0 Connect to Dash Platform
      await this.isClientReady()

      ++this.currentStep

      // 1 Fetch Documents
      this.docs = await this.fetchDocuments({
        typeLocator: 'example.example',
        queryOpts: { limit: 5, orderBy: [['$createdAt', 'desc']] },
      })

      ++this.currentStep

      // console.log('newDoc :>> ', newDoc)

      // this.docId = newDoc.transitions[0].id.toString()

      // console.log('docId :>> ', this.docId)

      // const fetchedDoc = await this.fetchDocumentById({
      //   typeLocator: 'example.example',
      //   docId: this.docId,
      // })

      // ++this.currentStep

      // console.log('fetchedDoc :>> ', fetchedDoc)

      // ++this.currentStep

      this.showSnackbar({ text: 'Success!', color: 'green' })
    } catch (e) {
      console.error(e)
      this.error = e.message
    }
  },
  methods: {
    ...mapActions([
      'isClientReady',
      'submitDocument',
      'fetchDocuments',
      'fetchDocumentById',
      'fetchIdentity',
      'showSnackbar',
    ]),
    async sendMessage() {
      this.broadcastState = 'sending'
      const typeLocator = `${process.env.example_CONTRACT_ID}.example`

      const document = { message: this.message }

      const data = await Connect.broadcast({ typeLocator, document })

      console.log('broadcast data :>> ', data)

      this.docId = data.payload.transitions[0].$id

      this.docs.unshift(
        await this.fetchDocumentById({
          typeLocator: 'example.example',
          docId: this.docId,
        })
      )

      console.log('this.docs :>> ', this.docs)

      console.log(
        data.payload.transitions[0],
        `text ${data.payload.transitions[0]}`
      )

      this.broadcastState = 'sent'
    },
    async DashConnect() {
      this.connectedState = 'connecting'

      const data = await Connect.connect()

      console.log('connect data :>> ', data)

      this.accountDPNS = data.payload

      console.log('this.accountDPNS :>> ', this.accountDPNS)

      this.connectedState = 'connected'
    },
    async getConfirmedBalance() {
      const data = await Connect.getConfirmedBalance()

      console.log('balance data :>> ', data)

      this.confirmedBalance = data.payload
    },
    async getUnusedAddress() {
      const data = await Connect.getUnusedAddress()

      console.log('balance data :>> ', data)

      this.unusedAddress = data.payload.address
    },
    async signMessage() {
      let data = await Connect.signMessage({ message: this.message })

      console.log('sign data :>> ', data)

      this.signature = data.payload.signature

      data = await Connect.verifyMessage({
        message: this.message,
        signature: data.payload.signature,
        address: data.payload.address,
      })

      console.log('verify data :>> ', data)
      this.verified = data.payload
      // this.unusedAddress = data.payload.address
    },
    async encryptMessage() {
      const identity = await this.fetchIdentity(this.accountDPNS.$ownerId)

      console.log('identity, accountDPNS :>> ', identity, this.accountDPNS)

      const data = await Connect.encryptForIdentityECIES({
        message: this.message,
        identity: identity.toJSON(),
      })

      console.log('encrypt data :>> ', data)

      this.encrypted = data.payload
    },
    async decryptMessage() {
      const identity = await this.fetchIdentity(this.accountDPNS.$ownerId)

      const data = await Connect.decryptForIdentityECIES({
        encrypted: this.encrypted,
        identity: identity.toJSON(),
      })

      console.log('decrypt data :>> ', data)

      this.decrypted = data.payload
    },
  },
}
</script>
