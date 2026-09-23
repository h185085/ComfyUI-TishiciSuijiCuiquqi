import { app } from "../../scripts/app.js";

// 提示词随机萃取器 — 前端界面（仿 Qwen TE Skill加载器）
// 「📂 加载 提示词」→ 弹出系统文件选择框 → 文件名/内容写入隐藏参数 → 状态栏显示已加载。
// 纯本地：文件由浏览器 FileReader 读取，不访问任何网络 API。
const NODE_TYPE = "TishiciSuijiCuiquqi";
const ACCEPT = ".md,.txt,.prompt,.text";
const EXTS = ["md", "txt", "prompt", "text"];

app.registerExtension({
    name: "TishiciSuijiCuiquqi.LoaderUI",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_TYPE) return;

        const originalOnNodeCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {
            originalOnNodeCreated?.apply(this, arguments);
            if (typeof this.addDOMWidget !== "function") return;
            if (this.__tscqLoaderWidget) return;

            const node = this;
            const getWidget = (name) => node.widgets?.find((item) => item?.name === name);
            const setWidgetValue = (name, value) => {
                const widget = getWidget(name);
                if (!widget) return false;
                widget.value = value;
                try {
                    widget.callback?.(value);
                } catch (error) {
                    console.warn("[TishiciSuijiCuiquqi] 更新参数失败", error);
                }
                const index = node.widgets.indexOf(widget);
                if (index >= 0) {
                    node.widgets_values ??= [];
                    node.widgets_values[index] = value;
                }
                return true;
            };
            const hideWidget = (widget) => {
                if (!widget || widget.__tscqHidden) return;
                widget.__tscqHidden = true;
                widget.hidden = true;
                widget.computeSize = () => [0, -4];
                widget.draw = () => {};
                widget.mouse = () => false;
                for (const element of [widget.element, widget.domElement, widget.el, widget.container]) {
                    if (!element?.style) continue;
                    element.style.display = "none";
                    element.style.visibility = "hidden";
                    element.style.width = "0";
                    element.style.height = "0";
                    element.style.margin = "0";
                    element.style.padding = "0";
                }
            };
            hideWidget(getWidget("加载文件名"));
            hideWidget(getWidget("加载文件内容"));

            const root = document.createElement("div");
            const hint = document.createElement("div");
            const controls = document.createElement("div");
            const loadButton = document.createElement("button");
            const clearButton = document.createElement("button");
            const status = document.createElement("div");
            hint.textContent = "选择本地 .md/.txt 提示词文件：";
            loadButton.textContent = "📂 加载 提示词";
            clearButton.textContent = "清除文件";
            status.textContent = "未加载文件";
            controls.append(loadButton, clearButton);
            root.append(hint, controls, status);
            root.style.boxSizing = "border-box";
            root.style.width = "100%";
            root.style.minHeight = "26px";
            root.style.padding = "4px 6px";
            root.style.border = "1px solid rgba(255, 255, 255, 0.12)";
            root.style.borderRadius = "4px";
            root.style.background = "rgba(0, 0, 0, 0.16)";
            root.style.color = "#cfd5dc";
            root.style.fontSize = "10px";
            root.style.lineHeight = "13px";
            root.style.whiteSpace = "normal";
            root.style.overflowWrap = "anywhere";
            hint.style.fontWeight = "600";
            controls.style.display = "flex";
            controls.style.gap = "4px";
            controls.style.alignItems = "center";
            controls.style.marginTop = "4px";
            loadButton.style.flex = "1 1 auto";
            clearButton.style.flex = "0 0 auto";
            for (const button of [loadButton, clearButton]) {
                button.type = "button";
                button.style.minHeight = "24px";
                button.style.padding = "2px 7px";
                button.style.border = "1px solid rgba(255, 255, 255, 0.16)";
                button.style.borderRadius = "3px";
                button.style.background = "rgba(255, 255, 255, 0.08)";
                button.style.color = "inherit";
                button.style.font = "inherit";
                button.style.cursor = "pointer";
            }
            status.style.color = "#9da8b5";
            status.style.marginTop = "3px";
            status.style.overflowWrap = "anywhere";

            const widgetHeight = () => 8 + 13 + 28 + 17;

            const widget = this.addDOMWidget(
                "tscq_loader_ui",
                "tscq_loader_ui",
                root,
                {
                    hideOnZoom: false,
                    serialize: false,
                    getMinHeight: () => widgetHeight(),
                },
            );
            widget.computeSize = (width) => [width, widgetHeight()];
            this.__tscqLoaderWidget = widget;
            this.setSize([
                Math.max(this.size?.[0] || 0, 300),
                Math.max(this.size?.[1] || 0, 150),
            ]);

            const refreshStatus = () => {
                const fileName = String(getWidget("加载文件名")?.value || "").trim();
                const content = String(getWidget("加载文件内容")?.value || "");
                status.textContent = fileName && content.trim() ? `已加载：${fileName}` : "未加载文件";
                clearButton.disabled = !(fileName && content.trim());
                clearButton.style.opacity = clearButton.disabled ? "0.5" : "1";
                node.graph?.setDirtyCanvas?.(true, true);
            };

            loadButton.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ACCEPT;
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const ext = file.name.toLowerCase().split(".").pop();
                    if (!EXTS.includes(ext)) {
                        status.textContent = "仅支持 .md / .txt / .prompt / .text 文件";
                        return;
                    }
                    const reader = new FileReader();
                    reader.onerror = () => {
                        status.textContent = "文件读取失败";
                    };
                    reader.onload = () => {
                        setWidgetValue("加载文件名", file.name);
                        setWidgetValue("加载文件内容", String(reader.result || ""));
                        refreshStatus();
                    };
                    reader.readAsText(file, "UTF-8");
                };
                input.click();
            };
            clearButton.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                setWidgetValue("加载文件名", "");
                setWidgetValue("加载文件内容", "");
                refreshStatus();
            };
            const originalOnConfigure = node.onConfigure;
            node.onConfigure = function () {
                const result = originalOnConfigure?.apply(this, arguments);
                setTimeout(refreshStatus, 0);
                return result;
            };
            refreshStatus();
        };
    },
});
