<template>
  <div>Sending invite code "{{ inviteCode }}" to DashPay</div>
</template>

<script>
import LocalMessageDuplexStream from 'post-message-stream'

const pageStream = new LocalMessageDuplexStream({
  name: 'DashPay:Dapp',
  target: 'DashPay:content',
})

export default {
  data() {
    return { inviteCode: '' }
  },
  created() {
    this.inviteCode = localStorage.getItem('inviteCode')

    console.log('this.inviteCode :>> ', this.inviteCode)

    pageStream.write({ name: 'inviteCode', payload: this.inviteCode })
  },
}
</script>

<style></style>
