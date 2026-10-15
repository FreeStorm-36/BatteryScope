<template>
  <Teleport to="body">
    <div class="robot-dock" :class="{ open: panelOpen }">
      <!-- 主动讲解气泡：面板关闭时，新消息以气泡形式提醒 -->
      <transition name="robot-bubble">
        <button v-if="bubble && !panelOpen" type="button" class="robot-bubble" @click="openPanel">
          <span class="rb-avatar"><RobotFace mood="concern" :size="30" /></span>
          <span class="rb-text">{{ bubble.text }}</span>
          <span class="rb-cta">点我讲完 →</span>
        </button>
      </transition>

      <!-- 对话面板 -->
      <transition name="robot-pop">
        <section v-if="panelOpen" class="robot-panel panel" role="dialog" aria-label="学习助手小锂">
          <header class="rp-head">
            <span class="rp-avatar"><RobotFace :mood="mood" :size="40" /></span>
            <div class="rp-id">
              <b>小锂</b>
              <i>{{ statusText }}</i>
            </div>
            <button type="button" class="rp-close" aria-label="收起小锂" @click="panelOpen = false">
              <IconGlyph name="close" :size="16" />
            </button>
          </header>

          <div ref="logBox" class="rp-log">
            <div v-for="(m, i) in messages" :key="i" class="rp-msg" :class="m.role">
              <p>{{ m.text }}</p>
              <router-link v-if="m.path" class="rp-src" :to="m.path">去「{{ m.ch }}」看看 →</router-link>
            </div>
            <div v-if="thinking" class="rp-msg bot">
              <span class="rp-dots" aria-label="小锂正在思考"><i></i><i></i><i></i></span>
            </div>
          </div>

          <div class="rp-chips">
            <button v-for="c in chips" :key="c" type="button" class="rp-chip" @click="send(c)">{{ c }}</button>
          </div>

          <form class="rp-input" @submit.prevent="submit">
            <input v-model="draft" type="text" placeholder="问小锂：任何本站讲过的问题" aria-label="向小锂提问" />
            <button type="submit" class="rp-send" :disabled="!draft.trim()">发送</button>
          </form>
          <p class="rp-note">回答由站内知识库检索生成；涉及实测数据的结论，以第 05 / 07 章页面为准。</p>
        </section>
      </transition>

      <!-- 悬浮球 -->
      <button
        type="button"
        class="robot-orb"
        :class="mood"
        :aria-label="panelOpen ? '收起学习助手小锂' : '打开学习助手小锂'"
        @click="togglePanel"
      >
        <RobotFace :mood="mood" :size="56" />
        <span v-if="unread" class="orb-badge num">{{ unread > 9 ? '9+' : unread }}</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import IconGlyph from './IconGlyph.vue'
import RobotFace from './RobotFace.vue'
import { ask, assistantStatus } from '../services/aiAssistant.js'
import { assistantQueue, takeAssistant } from '../services/assistantBus.js'

const panelOpen = ref(false)
const draft = ref('')
const thinking = ref(false)
const mood = ref('idle')
const unread = ref(0)
const bubble = ref(null)
const logBox = ref(null)
const messages = ref([
  {
    role: 'bot',
    text: '你好，我是小锂，这个作品的学习助手。我学过本站七章的内容——答错题、游戏失误时我会出来讲，也可以随时问我。',
    path: '/learn',
    ch: '08 学习'
  }
])

const chips = ['什么是 SOH？', '为什么快充会伤电池？', '析锂是什么？', '留出法回测为什么能检验预测？', 'NASA 的数据是怎么测的？']
const status = assistantStatus()
const statusText = computed(() => (status.remote ? `AI 接口已连接 · ${status.corpus} 条知识` : `本地知识库 · ${status.corpus} 条知识`))

// 语料里的 **强调** 是给文档 / 机制卡用的；聊天气泡按纯文本渲染，直接去星号
const clean = (t) => String(t || '').replace(/\*\*/g, '')

/* 主动消息：答错题 / 游戏失误 → 气泡提醒；面板已开则直接进对话流 */
watch(
  () => assistantQueue.pending.length,
  async () => {
    const msg = assistantQueue.pending[assistantQueue.pending.length - 1]
    if (!msg) return
    takeAssistant(msg.id)
    mood.value = msg.mood || 'concern'
    if (panelOpen.value) {
      messages.value.push({ role: 'bot', text: clean(msg.text), path: msg.path, ch: msg.ch })
      await scrollLog()
    } else {
      bubble.value = { ...msg, text: clean(msg.text) }
      unread.value += 1
    }
  }
)

async function scrollLog() {
  await nextTick()
  if (!logBox.value) return
  // 长答案不回顶：如果最后一条比视口还高，滚动到它的开头，否则滚到底
  const last = logBox.value.querySelector('.rp-msg:last-child')
  if (last && last.offsetHeight > logBox.value.clientHeight) {
    logBox.value.scrollTop = Math.max(0, last.offsetTop - 8)
  } else {
    logBox.value.scrollTop = logBox.value.scrollHeight
  }
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    unread.value = 0
    mood.value = 'idle'
    if (bubble.value) {
      messages.value.push({ role: 'bot', text: bubble.value.text, path: bubble.value.path, ch: bubble.value.ch })
      bubble.value = null
      scrollLog()
    }
  }
}

function openPanel() {
  if (!panelOpen.value) togglePanel()
  else if (bubble.value) {
    messages.value.push({ role: 'bot', text: bubble.value.text, path: bubble.value.path, ch: bubble.value.ch })
    bubble.value = null
    scrollLog()
  }
}

async function submit() {
  const q = draft.value.trim()
  if (!q || thinking.value) return
  draft.value = ''
  messages.value.push({ role: 'user', text: q })
  await scrollLog()
  thinking.value = true
  mood.value = 'think'
  const r = await ask(q)
  thinking.value = false
  mood.value = r.mood || 'idle'
  messages.value.push({
    role: 'bot',
    text: r.remoteFailed ? `${r.text}\n（远端接口暂时不可用，以上改由站内知识库回答）` : r.text,
    path: r.entry?.path,
    ch: r.entry?.ch
  })
  await scrollLog()
}

function send(text) {
  draft.value = text
  submit()
}
</script>

<style scoped lang="scss">
.robot-dock {
  position: fixed; right: 26px; bottom: 26px; z-index: 80;
  display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
}

/* ── 悬浮球 ── */
.robot-orb {
  position: relative;
  width: 60px; height: 60px; padding: 0;
  border: 1px solid var(--hairline-strong); border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #1d2a45 0%, #101827 70%);
  box-shadow: 0 10px 28px rgba(6, 12, 26, 0.6), 0 0 18px rgba(34, 211, 238, 0.16);
  cursor: pointer;
  animation: robot-float 3.4s ease-in-out infinite;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 14px 32px rgba(6, 12, 26, 0.66), 0 0 26px rgba(34, 211, 238, 0.3); }
  &.think { animation-duration: 1.1s; }
}
@keyframes robot-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.orb-badge {
  position: absolute; top: -2px; right: -2px;
  min-width: 20px; height: 20px; padding: 0 5px;
  display: grid; place-items: center;
  border-radius: 999px; background: var(--red); color: #fff;
  font-size: 11px; font-weight: 600;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

/* ── 主动气泡 ── */
.robot-bubble {
  display: flex; align-items: center; gap: 10px;
  max-width: 330px; padding: 10px 14px;
  border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 14px;
  background: rgba(19, 26, 43, 0.94); backdrop-filter: blur(8px);
  box-shadow: var(--shadow-1);
  color: var(--text-2); font-size: 12.5px; line-height: 1.7; text-align: left;
  cursor: pointer;
  &:hover { border-color: rgba(245, 158, 11, 0.65); color: var(--text-1); }
  .rb-avatar { flex: 0 0 auto; }
  .rb-text { flex: 1; min-width: 0;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .rb-cta { flex: 0 0 auto; font-size: 11.5px; color: var(--amber); }
}
.robot-bubble-enter-active, .robot-bubble-leave-active { transition: all 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
.robot-bubble-enter-from, .robot-bubble-leave-to { opacity: 0; transform: translateY(10px) scale(0.94); }

/* ── 对话面板 ── */
.robot-panel {
  width: 348px; max-height: min(520px, calc(100vh - 130px));
  display: flex; flex-direction: column;
  padding: 0; overflow: hidden;
  background: rgba(13, 18, 32, 0.96);
  box-shadow: var(--shadow-2), 0 0 0 1px rgba(34, 211, 238, 0.08);
}
.robot-pop-enter-active, .robot-pop-leave-active { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.robot-pop-enter-from, .robot-pop-leave-to { opacity: 0; transform: translateY(16px) scale(0.96); }

.rp-head {
  display: flex; align-items: center; gap: 10px;
  padding: 13px 14px; border-bottom: 1px solid var(--hairline);
  background: linear-gradient(180deg, rgba(34, 211, 238, 0.07), transparent);
  .rp-avatar { flex: 0 0 auto; }
  .rp-id { flex: 1; min-width: 0;
    b { display: block; font-size: 14.5px; color: var(--text-1); }
    i { font-style: normal; font-size: 11px; color: var(--text-3); } }
  .rp-close {
    flex: 0 0 auto; width: 44px; height: 44px; display: grid; place-items: center;
    border: 0; border-radius: 10px; background: transparent; color: var(--text-3); cursor: pointer;
    &:hover { color: var(--text-1); background: rgba(77, 168, 255, 0.08); }
  }
}

.rp-log {
  flex: 1; min-height: 120px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px;
}
.rp-msg {
  max-width: 88%; padding: 9px 12px; border-radius: 12px;
  font-size: 12.5px; line-height: 1.8; white-space: pre-wrap; word-break: break-word;
  &.bot { align-self: flex-start; border: 1px solid var(--hairline); border-bottom-left-radius: 4px;
    background: rgba(20, 27, 46, 0.85); color: var(--text-2); }
  &.user { align-self: flex-end; border-bottom-right-radius: 4px;
    background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.28); color: var(--text-1); }
}
.rp-src { display: inline-block; margin-top: 6px; font-size: 11.5px; color: var(--cyan); text-decoration: none;
  &:hover { text-decoration: underline; } }
.rp-dots { display: inline-flex; gap: 5px; padding: 3px 2px;
  i { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); animation: rp-blink 1.1s infinite;
    &:nth-child(2) { animation-delay: 0.18s; }
    &:nth-child(3) { animation-delay: 0.36s; } } }
@keyframes rp-blink { 0%, 60%, 100% { opacity: 0.25; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }

.rp-chips { display: flex; flex-wrap: wrap; gap: 7px; padding: 0 14px 10px; }
.rp-chip {
  min-height: 32px; padding: 5px 11px;
  border: 1px solid var(--hairline); border-radius: 999px;
  background: rgba(77, 168, 255, 0.06); color: var(--text-2);
  font-size: 11.5px; cursor: pointer; transition: all 0.2s ease;
  &:hover { border-color: var(--hairline-strong); color: var(--text-1); background: rgba(77, 168, 255, 0.12); }
}

.rp-input { display: flex; gap: 8px; padding: 0 14px 10px;
  input {
    flex: 1; min-width: 0; height: 40px; padding: 0 12px;
    border: 1px solid var(--hairline); border-radius: 10px;
    background: rgba(10, 14, 26, 0.7); color: var(--text-1); font-size: 12.5px;
    &::placeholder { color: var(--text-3); }
    &:focus { border-color: rgba(34, 211, 238, 0.5); outline: none; }
  }
  .rp-send {
    flex: 0 0 auto; min-width: 64px; height: 40px;
    border: 1px solid rgba(34, 211, 238, 0.4); border-radius: 10px;
    background: rgba(34, 211, 238, 0.14); color: #a5f3fc; font-size: 12.5px; cursor: pointer;
    &:disabled { opacity: 0.45; cursor: default; }
    &:not(:disabled):hover { background: rgba(34, 211, 238, 0.24); }
  }
}
.rp-note { padding: 0 14px 12px; font-size: 10.5px; color: var(--text-3); line-height: 1.6; }

/* 手机：面板改为底部抽屉，避开导航栏；触摸目标撑到 44px */
@media (max-width: 767px) {
  .robot-dock { right: 14px; bottom: 14px; }
  .robot-orb { width: 56px; height: 56px; }
  .robot-panel {
    position: fixed; left: 12px; right: 12px; bottom: 82px;
    width: auto; max-height: min(66vh, 480px);
  }
  .robot-bubble { max-width: calc(100vw - 110px); }
  .rp-chip { min-height: 44px; padding: 8px 14px; font-size: 12.5px; }
  .rp-input { input { height: 44px; font-size: 13px; } .rp-send { height: 44px; min-width: 72px; } }
}
</style>
