# -*- coding: utf-8 -*-
"""
提示词随机萃取器 — 本地 ComfyUI 插件入口
界面与机制仿 comfyUI-llama-TE 的 Skill 加载器：前端弹系统文件框选文件，内容存节点参数。
纯本地，不连任何外部/云端/LLM API，无任何后端路由。
"""
import os

from .tishici_node import TishiciSuijiCuiquqi

NODE_CLASS_MAPPINGS = {
    "TishiciSuijiCuiquqi": TishiciSuijiCuiquqi,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TishiciSuijiCuiquqi": "提示词随机萃取器",
}

WEB_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
