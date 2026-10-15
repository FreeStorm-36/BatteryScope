// 浏览器临时配置目录的统一管理
// ---------------------------------------------------------------
// ⚠️ 为什么需要这个文件（2026-10-15 踩到的真实故障）：
//
// 这些验证/截图脚本都用 Edge headless 开一个 CDP 调试实例，而 Edge 需要一个
// `--user-data-dir`。每个 profile 目录跑完一次约 80—100 MB。
// 早期脚本只 `taskkill` 掉进程、**没删目录**，且目录名带时间戳、永远不会被复用 ——
// 于是一轮 8 页截图就在 `%TEMP%` 留下 8 个目录。累积几十轮后系统盘被塞满，
// 表现是**后续所有命令报 ENOSPC，整个工具链瘫痪**（连 `echo` 都跑不了）。
//
// 本模块提供三件事：
//   mkProfile(prefix)   —— 生成一个带时间戳的 profile 路径
//   dropProfile(dir)    —— 进程退出后删除该目录（带重试，Windows 句柄释放有延迟）
//   dropProfileSync(dir)—— 同步版，供 catch / 异常路径兜底
//   sweepStale(prefix)  —— 启动时清掉历史遗留的同类目录（自我修复，防止再次累积）
//
// 用法（每个脚本三处改动）：
//   ① 顶部 `const { mkProfile, dropProfile, dropProfileSync, sweepStale } = require('./_profile.cjs')`
//   ② 主流程开头 `sweepStale('<前缀>-')`
//   ③ spawn 前 `profile = mkProfile('<前缀>-')`，收尾 `await dropProfile(profile)`
const fs = require('fs')
const path = require('path')

const TEMP = process.env.TEMP || process.env.TMPDIR || '/tmp'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 生成 profile 目录路径（不创建，Edge 自己会建）。带 pid 与时间戳，避免并发冲突。 */
function mkProfile(prefix) {
  return path.join(TEMP, `${prefix}${process.pid}-${Date.now()}`)
}

/**
 * 删除 profile 目录。Edge 刚被 taskkill 时文件句柄可能还没释放，
 * 所以重试若干次；实在删不掉就放弃 —— 下次 sweepStale 会兜住，不会无限累积。
 */
async function dropProfile(dir, tries = 12) {
  if (!dir) return
  for (let i = 0; i < tries; i++) {
    try { fs.rmSync(dir, { recursive: true, force: true }); return } catch { /* 句柄未释放，等一下重试 */ }
    await sleep(250)
  }
}

/** 同步版删除，供 catch / 异常路径使用。 */
function dropProfileSync(dir) {
  if (!dir) return
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
}

/**
 * 清理历史遗留目录。
 * 只删 `%TEMP%` 下匹配前缀、且**超过 `hours` 小时**没动过的目录，
 * 这样不会误删同一时刻其他脚本正在使用的 profile。
 * @param {string} prefix 目录名前缀，如 'es-'
 * @returns {number} 实际删除的目录数
 */
function sweepStale(prefix, hours = 1) {
  const cutoff = Date.now() - hours * 3600 * 1000
  let n = 0
  try {
    for (const name of fs.readdirSync(TEMP)) {
      if (!name.startsWith(prefix)) continue
      const full = path.join(TEMP, name)
      try {
        const st = fs.statSync(full)
        if (!st.isDirectory() || st.mtimeMs > cutoff) continue
        fs.rmSync(full, { recursive: true, force: true })
        n++
      } catch { /* 单个失败不影响整体 */ }
    }
  } catch { /* TEMP 不可读就算了 */ }
  return n
}

module.exports = { mkProfile, dropProfile, dropProfileSync, sweepStale }
