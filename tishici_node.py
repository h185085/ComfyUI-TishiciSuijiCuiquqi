# -*- coding: utf-8 -*-
"""
提示词随机萃取器 — 纯本地 ComfyUI 节点（界面仿 Qwen TE Skill加载器）
点「📂 加载 提示词」→ 弹出系统文件选择框 → 选中 .md/.txt → 随机抽一整段输出。
文件内容存在节点参数里（和 Skill 加载器同机制），全程本地，不连任何外部/云端/LLM API。
"""
import os
import re
import random

_支持扩展名 = (".md", ".txt", ".prompt", ".text")
_内联最大字节数 = 8 * 1024 * 1024  # 8MB


class TishiciSuijiCuiquqi:
    CATEGORY = "提示词工具"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("提示词",)
    FUNCTION = "run"
    OUTPUT_NODE = False

    # 跨轮"不重复抽取"状态： unique_id -> [文件名, [剩余索引]]
    _state = {}

    @classmethod
    def IS_CHANGED(cls, *args, **kwargs):
        # NaN 永远不等于自身 → ComfyUI 每轮队列都判定"输入变了"，强制真执行，
        # 否则输入没变时会被缓存命中、直接复用上次输出，随机抽取就不再跑了。
        return float("nan")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "模式": (["随机抽一段", "返回全文"], {"default": "随机抽一段"}),
                "分段方式": (["空行分段", "每行一段", "自定义正则"], {"default": "空行分段"}),
                "自定义分隔": ("STRING", {"default": r"第\s*\d+\s*[段条]?", "multiline": False}),
                "抽取段数": ("INT", {"default": 1, "min": 1, "max": 50, "step": 1}),
                "随机种子": ("INT", {"default": -1, "min": -1, "max": 0xffffffffffffffff}),
                "不重复抽取": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                # 由前端文件选择框填入，保持为普通 widget 以便保存进工作流
                "加载文件名": ("STRING", {"default": "", "multiline": False}),
                "加载文件内容": ("STRING", {"default": "", "multiline": True}),
            },
            "hidden": {"unique_id": "UNIQUE_ID"},
        }

    def run(self, 模式, 分段方式, 自定义分隔, 抽取段数, 随机种子, 不重复抽取,
            加载文件名="", 加载文件内容="", unique_id=None):
        text = str(加载文件内容 or "")
        name = str(加载文件名 or "").strip()
        if not text.strip():
            raise ValueError("未加载文件：请点节点上的「📂 加载 提示词」选择一个 .md/.txt 文件。")

        if 模式 == "返回全文":
            return (text,)

        # —— 分段（整段为最小单位，绝不切碎）——
        if 分段方式 == "每行一段":
            segs = [s.strip() for s in text.splitlines() if s.strip()]
        else:
            sep = r"\n\s*\n" if 分段方式 != "自定义正则" else (自定义分隔 or r"\n\s*\n")
            try:
                parts = re.split(sep, text)
            except re.error:
                parts = text.split("\n\n")
            segs = [s.strip() for s in parts if s.strip()]

        if not segs:
            return ("【错误】按当前分段方式未切出任何段落",)

        rng = random.Random() if (随机种子 is None or 随机种子 < 0) else random.Random(随机种子)

        if 不重复抽取:
            cached = self._state.get(unique_id)
            if not cached or cached[0] != name:
                pool = list(range(len(segs)))
                rng.shuffle(pool)
                cached = [name, pool]
                self._state[unique_id] = cached
            pool = cached[1]
            if not pool:  # 一轮抽完，自动重置
                pool = list(range(len(segs)))
                rng.shuffle(pool)
                cached[1] = pool
            n = min(抽取段数, len(pool))
            idxs = [pool.pop() for _ in range(n)]
            out = "\n\n".join(segs[i] for i in idxs)
        else:
            n = min(抽取段数, len(segs))
            out = "\n\n".join(rng.choice(segs) for _ in range(n))

        return (out,)
