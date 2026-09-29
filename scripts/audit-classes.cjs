/* 跨组件样式审计。
 *
 * 起因：EndingView 用了 class="card-panel"，但 .card-panel 只定义在 PredictionView 的
 * <style scoped> 里 —— scoped 样式带 data-v 属性选择器，跨组件完全不生效。
 * 于是那边的"卡片"既没底色也没边框，白丢一层视觉结构，而且这种问题肉眼几乎看不出来。
 *
 * 本脚本做两件事：
 *   ① 找"用了但任何地方都没定义"的类名 —— 多半是打错字，或样式被写在别处；
 *   ② 找"本组件在用、却只在别的组件的 scoped 块里定义"的类名 —— 就是 card-panel 那类。
 *
 * 用法：node scripts/audit-classes.cjs
 * 静态类名扫描，动态拼接的 :class="{...}" 已尽量覆盖，仍可能有少量误报，按需忽略。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(vue|scss|css)$/.test(e.name)) out.push(p)
  }
  return out
}

const files = walk(SRC)

/** 从一段样式文本里抓出所有类选择器（含 .a.b 里的两个） */
function classSelectors(css) {
  const set = new Set()
  // 先剥掉注释，避免注释里的 .xxx 被当成选择器
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  for (const m of clean.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) set.add(m[1])
  return set
}

/** 从模板片段里抓出静态类名：class="a b" 与 :class="{ a: x, 'b': y }" */
function classUsages(html) {
  const set = new Set()
  for (const m of html.matchAll(/\sclass="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c && !c.includes('{')) set.add(c)
  }
  for (const m of html.matchAll(/:class="([^"]*)"/g)) {
    for (const c of m[1].matchAll(/['"]?(-?[_a-zA-Z][\w-]*)['"]?\s*:/g)) set.add(c[1])
  }
  return set
}

// base.scss 等「全局样式」= 样式文件 + 任何不带 scoped 的 <style> 块（如 App.vue）
const globalClasses = new Set()
const vueFiles = []
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  if (f.endsWith('.vue')) {
    vueFiles.push({ f, src })
  } else {
    for (const c of classSelectors(src)) globalClasses.add(c)
  }
}

const own = new Map()
const scopedAll = new Set()
const scopedOwner = new Map()
for (const { f, src } of vueFiles) {
  const blocks = src.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []
  const s = new Set()
  for (const blk of blocks) {
    const scoped = /\bscoped\b/.test(blk.slice(0, blk.indexOf('>')))
    const css = blk.replace(/^<style[^>]*>/, '').replace(/<\/style>$/, '')
    for (const c of classSelectors(css)) {
      s.add(c)
      // 不带 scoped 的样式块是全局的，别的组件能用；带 scoped 的只属于本组件
      if (!scoped) globalClasses.add(c)
      else { scopedAll.add(c); if (!scopedOwner.has(c)) scopedOwner.set(c, []); scopedOwner.get(c).push(path.relative(ROOT, f)) }
    }
  }
  own.set(f, s)
}

const undefinedUses = []
const crossScoped = []
for (const { f, src } of vueFiles) {
  const tpl = (src.match(/<template>([\s\S]*?)<\/template>/) || [, ''])[1]
  const rel = path.relative(ROOT, f)
  for (const c of classUsages(tpl)) {
    if (own.get(f).has(c) || globalClasses.has(c)) continue
    if (scopedAll.has(c)) crossScoped.push({ cls: c, used: rel, defined: scopedOwner.get(c).join(', ') })
    else undefinedUses.push({ cls: c, used: rel })
  }
}

console.log('=== ① 模板里用了、但任何样式里都找不到定义的类名 ===')
if (!undefinedUses.length) console.log('（无）')
for (const u of undefinedUses) console.log(`  .${u.cls}  ← ${u.used}`)

console.log('\n=== ② 本组件在用、却只在别的组件 scoped 样式里定义的类名（跨组件不生效）===')
if (!crossScoped.length) console.log('（无）')
for (const u of crossScoped) console.log(`  .${u.cls}\n      使用：${u.used}\n      仅定义于：${u.defined}`)

console.log(`\n汇总：${vueFiles.length} 个组件，全局类 ${globalClasses.size} 个，scoped 类 ${scopedAll.size} 个。`)
