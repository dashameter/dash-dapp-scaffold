<script setup lang="ts">
const connectStore = useConnectStore();
const connect = connectStore.connect;
const client = connectStore.client;
const me = connectStore.me;

const unusedAddress = $ref("");

const connectWallet = async () => {
  await connectStore.connectWallet();

  unusedAddress = (await connect.getUnusedAddress()).payload.address;
};

const broadcastState = $ref("");
const message = $ref("");
const doc = $ref({});

const sendMessage = async () => {
  broadcastState = "sending";

  const typeLocator = "CqZLoX26CqHcNStJ4w2MU52EcJgn2oZsztYiuih7e9JY.example";

  const document = { message };

  const data = await connect.broadcastDocument({ typeLocator, document });

  console.log("broadcast data :>> ", data);

  doc = data.payload.transitions[0];

  broadcastState = "sent";
};

const signature = $ref("");
const verified = $ref(false);

const signMessage = async () => {
  const signData = await connect.signMessage({ message });

  console.log("sign data :>> ", signData);

  signature = signData.payload.signature;

  const verifyData = await connect.verifyMessage({
    message,
    signature: signData.payload.signature,
    address: signData.payload.address,
  });

  console.log("verify data :>> ", verifyData);
  verified = verifyData.payload;
};

const encrypted = $ref("");
const encryptMessage = async () => {
  const identity = await client.platform.identities.get(me.dpns.$ownerId);

  console.log("identity, accountDPNS :>> ", identity, me.dpns);

  const data = await connect.encryptForIdentityECIES({
    message,
    identity: identity.toJSON(),
  });

  console.log("encrypt data :>> ", data);

  encrypted = data.payload;
};

const decrypted = $ref("");
const decryptMessage = async () => {
  const identity = await client.platform.identities.get(me.dpns.$ownerId);

  const data = await connect.decryptForIdentityECIES({
    encrypted,
    identity: identity.toJSON(),
  });

  console.log("decrypt data :>> ", data);

  decrypted = data.payload;
};

const { t } = useI18n();
</script>

<template>
  <div>
    <div text-4xl>
      <img src="icon.png" alt="" style="margin: auto; width: 175px" />
    </div>
    <p>
      <a
        rel="noreferrer"
        href="https://github.com/antfu/vitesse"
        target="_blank"
      >
        Dash Dapp Scaffold
      </a>
    </p>
    <p>
      <em text-sm opacity-75>{{ t("intro.desc") }}</em>
    </p>
    <div>
      <button btn m-3 text-sm @click="connectWallet">
        {{ t("button.connect") }}
      </button>
    </div>
    <div>Dash User: {{ me.label }}</div>
    <div>Balance: {{ me.balance }}</div>
    <div>Unused Address: {{ unusedAddress }}</div>

    <div py-4 />

    <input
      id="input"
      v-model="message"
      :placeholder="t('intro.message')"
      :aria-label="t('intro.message')"
      type="text"
      autocomplete="false"
      p="x4 y2"
      w="250px"
      text="center"
      bg="transparent"
      border="~ rounded gray-200 dark:gray-700"
      outline="none active:none"
      @keydown.enter="sendMessage"
    />
    <div>
      <button btn m-3 text-sm @click="sendMessage">
        {{ t("button.send") }}
      </button>
      <button btn m-3 text-sm @click="signMessage">
        {{ t("button.sign_verify") }}
      </button>
      <button btn m-3 text-sm @click="encryptMessage">
        {{ t("button.encrypt") }}
      </button>
      <button btn m-3 text-sm @click="decryptMessage">
        {{ t("button.decrypt") }}
      </button>
    </div>
    <div>BroadcastState: {{ broadcastState }}</div>
    <div>Document:</div>
    <div>{{ doc }}</div>
    <div>Signature:</div>
    <div>{{ signature }}</div>
    <div>Verified: {{ verified }}</div>
    <div>Encrypted:</div>
    <div>{{ encrypted }}</div>
    <div>Decrypted:</div>
    <div>{{ decrypted }}</div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: default
</route>
