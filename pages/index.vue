<template>
  <v-row>
    <v-col cols="10" class="mx-auto">
      <v-card v-if="error">
        <v-card-title>
          {{ error }}
        </v-card-title>
      </v-card>
      <v-card>
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
          </v-list-item-group>
        </v-list>
      </v-card>
      <v-card>
        <v-card-title> My Username: </v-card-title>
        <pre>
        {{ getMyUsername }}
      </pre
        >
      </v-card>
      <v-card>
        <v-card-title> Document read from cache: </v-card-title>
        <pre>
        {{ JSON.stringify(getDocumentById(docId), null, ' ') }}
      </pre
        >
      </v-card>
      <v-card>
        <v-card-title> Documents fetched from dpp: </v-card-title>
        <div v-for="(doc, idx) in docs" :key="idx">
          <pre>
      {{ doc }}
      </pre
          >
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { mapActions, mapGetters } from 'vuex'

export default {
  components: {},
  data() {
    return {
      steps: [
        'Connect to Dash Platform',
        'Submit Document',
        'Fetch Document By Id',
        'Fetch Documents',
      ],
      currentStep: 0,
      docId: '',
      docs: [],
      error: null,
    }
  },
  computed: { ...mapGetters(['getDocumentById', 'getMyUsername']) },
  async created() {
    try {
      await this.isClientReady()

      ++this.currentStep

      const newDoc = await this.submitDocument({
        typeLocator: 'example.example',
        doc: { message: 'Hello World!' },
      })

      ++this.currentStep

      console.log('newDoc :>> ', newDoc)

      this.docId = newDoc.transitions[0].id.toString()

      console.log('docId :>> ', this.docId)

      const fetchedDoc = await this.fetchDocumentById({
        typeLocator: 'example.example',
        docId: this.docId,
      })

      ++this.currentStep

      console.log('fetchedDoc :>> ', fetchedDoc)

      this.docs = await this.fetchDocuments({
        typeLocator: 'example.example',
        queryOpts: { limit: 100, orderBy: [['$createdAt', 'desc']] },
      })

      ++this.currentStep

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
  },
}
</script>
