<script setup>
import { ref } from "vue";
import { Button, Drawer, Dropdown, Input, Menu, MenuItem } from "ant-design-vue";
import { UserOutlined } from "@ant-design/icons-vue";
import { useRoute, useRouter } from "vue-router";
import { identifierPattern, tokenPattern } from "../../analytics/credentials.js";

defineProps({ custom: Boolean });

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const open = ref(false);
const accountId = ref("");
const token = ref("");
const error = ref("");
const firstInput = ref(null);

async function select({ key }) {
  menuOpen.value = false;
  if (key === "default") {
    await router.push({ name: "home", query: route.query });
    return;
  }

  accountId.value = "";
  token.value = "";
  error.value = "";
  open.value = true;
}

function focusForm(visible) {
  if (visible) firstInput.value?.focus();
}

async function confirm() {
  const id = accountId.value.trim().toLowerCase();
  const apiToken = token.value.trim();
  if (!identifierPattern.test(id) || !tokenPattern.test(apiToken)) {
    error.value = "请输入 32 位十六进制 Account ID 和有效的 API Token。";
    return;
  }

  await router.push({
    name: "account",
    params: { accountId: id, token: apiToken },
    query: route.query,
  });
  close();
}

function close() {
  open.value = false;
  token.value = "";
}
</script>

<template>
  <Dropdown
    v-model:open="menuOpen"
    :trigger="['click']"
    placement="bottomRight"
    overlay-class-name="picker-popup"
  >
    <button
      class="picker-trigger account-trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="menuOpen"
      :aria-label="custom ? '自定义账户' : '默认账户'"
    >
      <UserOutlined class="account-symbol" aria-hidden="true" />
      <span class="account-label">{{ custom ? "自定义账户" : "默认账户" }}</span>
      <span class="picker-chevron" aria-hidden="true" />
    </button>
    <template #overlay>
      <Menu @click="select">
        <MenuItem key="add">添加账户</MenuItem>
        <MenuItem v-if="custom" key="default">切回默认账户</MenuItem>
      </Menu>
    </template>
  </Dropdown>

  <Drawer
    :open="open"
    width="min(456px, 100vw)"
    title="添加账户"
    @close="close"
    @after-open-change="focusForm"
  >
    <form class="account-form" @submit.prevent="confirm">
      <div class="field">
        <label for="cloudflare-account-id">Account ID</label>
        <Input
          id="cloudflare-account-id"
          ref="firstInput"
          v-model:value="accountId"
          autocomplete="off"
          spellcheck="false"
          :maxlength="32"
          required
        />
      </div>
      <div class="field">
        <label for="cloudflare-token">API Token</label>
        <Input
          id="cloudflare-token"
          v-model:value="token"
          type="password"
          autocomplete="off"
          aria-describedby="token-permissions"
          required
        />
      </div>
      <div id="token-permissions" class="permissions">
        <strong>Token 所需权限</strong>
        <span>站点 · Zone Read、Analytics Read</span>
        <span>账户 · Account Analytics Read（Workers）</span>
        <span>自定义 Token 会显示在地址栏，请勿分享该链接。</span>
      </div>
      <p v-if="error" role="alert" class="form-error">{{ error }}</p>
      <div class="actions">
        <Button @click="close">取消</Button>
        <Button type="primary" html-type="submit">确定</Button>
      </div>
    </form>
  </Drawer>
</template>

<style scoped>
.account-symbol {
  display: none;
}

.account-form {
  display: grid;
  gap: 16px;
}

.field,
.permissions {
  display: grid;
  gap: 6px;
}

.field label,
.permissions strong {
  color: var(--text);
  font-weight: 600;
}

.permissions {
  padding: 12px;
  border-radius: 8px;
  background: var(--background);
  color: var(--muted);
  font-size: 13px;
}

.form-error {
  color: var(--danger);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 580px) {
  .account-label {
    display: none;
  }

  .account-trigger {
    gap: 5px;
    padding-inline: 8px;
  }

  .account-symbol {
    display: inline-flex;
  }
}
</style>
