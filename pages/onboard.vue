<template>
  <v-card>
    <v-card-title
      ><v-img max-height="40px" max-width="40px" src="icons/150.png" />
      DashPay</v-card-title
    >
    <v-card-text class="text-center"
      >Your invite code is:<strong>
        {{ inviteCode || 'N/A' }}</strong
      ></v-card-text
    >
    <v-card-text class="text-center">
      <v-btn href="chrome://extensions" color="primary"
        >Click here to install DashPay</v-btn
      >
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  data() {
    return { inviteCode: '' }
  },
  created() {
    console.log('this.$route :>> ', this.$route)
    this.inviteCode = this.$route.query.invite
    localStorage.setItem('inviteCode', this.inviteCode)
  },
}
</script>

<style></style>
