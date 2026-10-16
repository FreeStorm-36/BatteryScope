// 弹层行为统一收口：Esc 关闭、焦点移入、焦点困在层内、关闭后焦点归还。
//
// 为什么值得单独一个 composable：站内有三处 role="dialog"（章节目录、数据可信度说明、
// 学习助手小锂），它们的开关状态、面板元素、是否需要困住焦点各不相同，
// 但"键盘用户能不能用"这件事必须三处一致 —— 各写一遍必然漂移。
//
// 之前的状态：只有章节目录处理了 Esc，三处都没有把焦点移进层内，
// 也没有在关闭后归还焦点。键盘用户打开"数据说明"后，Tab 会直接跑到遮罩底下的页面去，
// 而且 Esc 关不掉。
import { watch, nextTick, onBeforeUnmount } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

/**
 * @param {import('vue').Ref<boolean>} isOpen  弹层开关
 * @param {import('vue').Ref<HTMLElement|null>} panelRef  弹层根元素（建议带 tabindex="-1"）
 * @param {{ trap?: boolean, lockScroll?: boolean }} [options]
 *   trap:       是否把 Tab 困在层内（模态抽屉要，浮动的聊天面板不要，否则用户没法去看页面）
 *   lockScroll: 是否锁住背景滚动（模态抽屉要，浮动面板不要）
 */
export function useDialog(isOpen, panelRef, options = {}) {
  const { trap = true, lockScroll = true } = options
  let lastFocused = null
  let prevOverflow = ''

  // offsetParent 为 null 说明元素不可见（display:none 或折叠），不能算进 tab 序列，
  // 否则焦点会被送进一个看不见的地方。
  const focusables = () => {
    const el = panelRef.value
    if (!el) return []
    return Array.from(el.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null)
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      // 用捕获阶段：层内某些控件（输入框、可视化）可能吞掉按键
      e.stopPropagation()
      isOpen.value = false
      return
    }
    if (!trap || e.key !== 'Tab') return
    const el = panelRef.value
    if (!el) return
    const list = focusables()
    if (!list.length) {
      // 层里没有可聚焦元素时，至少别让 Tab 跑出去
      e.preventDefault()
      el.focus?.()
      return
    }
    const first = list[0]
    const last = list[list.length - 1]
    const active = document.activeElement
    const inside = el.contains(active)
    if (e.shiftKey && (active === first || !inside)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (active === last || !inside)) {
      e.preventDefault()
      first.focus()
    }
  }

  function release() {
    document.removeEventListener('keydown', onKeydown, true)
    if (lockScroll) document.body.style.overflow = prevOverflow
  }

  watch(isOpen, async (open) => {
    if (open) {
      lastFocused = document.activeElement
      if (lockScroll) {
        prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      }
      document.addEventListener('keydown', onKeydown, true)
      await nextTick()
      const list = focusables()
      ;(list[0] || panelRef.value)?.focus?.()
    } else {
      release()
      // 焦点还给当初打开它的那个按钮；不还的话键盘用户会被丢回文档开头，
      // 得从头 Tab 一遍才能回到原处。
      lastFocused?.focus?.()
      lastFocused = null
    }
  })

  // 组件在弹层开着的时候被卸载（换章、路由跳转）也要把副作用收干净
  onBeforeUnmount(release)
}
