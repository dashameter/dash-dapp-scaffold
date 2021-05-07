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
        <v-card-actions>
          <v-btn color="primary" @click="DashConnect">connect wallet</v-btn>
        </v-card-actions>
      </v-card>
      <v-card class="mb-10">
        <v-card-text class="mb-0 pb-0">Write a message</v-card-text>
        <v-text-field v-model="message" />
        <v-card-actions>
          <v-btn
            :disabled="!accountDPNS"
            :loading="broadcastState === 'sending'"
            color="secondary"
            @click="sendMessage"
            >Send Message</v-btn
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
import LocalMessageDuplexStream from 'post-message-stream'

const pageStream = new LocalMessageDuplexStream({
  name: 'DashPay:Dapp',
  target: 'DashPay:content',
})

export default {
  components: {},
  data() {
    return {
      connectedState: 'disconnected',
      broadcastState: null,
      message: '',
      accountDPNS: null,
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
  mounted() {
    const that = this
    pageStream.on('data', async (data) => {
      console.log(data)
      switch (data.name) {
        case 'onConnect':
          if (data.payload) {
            that.accountDPNS = data.payload
            that.connectedState = 'connected'
          }
          break

        case 'onBroadcastDocument':
          if (data.payload) {
            console.log('onBroadcastDocument', data.payload)

            that.docId = data.payload.transitions[0].$id

            that.docs.unshift(
              await that.fetchDocumentById({
                typeLocator: 'example.example',
                docId: that.docId,
              })
            )
            console.log('that.docs :>> ', that.docs)
            console.log(
              data.payload.transitions[0],
              `text ${data.payload.transitions[0]}`
            )
            that.broadcastState = 'sent'
          }
          break

        default:
          break
      }
    })
  },
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
      'showSnackbar',
    ]),
    sendMessage() {
      this.broadcastState = 'sending'
      const typeLocator = `${process.env.example_CONTRACT_ID}.example`

      const document = { message: this.message }

      pageStream.write({
        name: 'broadcastDocument',
        payload: { typeLocator, document },
      })
    },
    DashConnect() {
      this.connectedState = 'connecting'

      pageStream.write({ name: 'connect', payload: null })
    },
  },
}
</script>
