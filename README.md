# Generate images MCP server

兼容OpenAI DALL-E 模型 API调用的 Model Context Protocol (MCP) 服务器实现。

本项目基于https://github.com/nicekate/flux-dev-mcp改编，感谢原作者的贡献。
使用了**完全兼容OpenAI接口**的 转发API 服务，包含openai以及Anthropic等多家大语言模型API，MidJourney和Flux等文生图绘画模型API，
最新模型claude-3-7-sonnet已上线!!


> 使用我的邀请链接 https://xiaohumini.site/register?aff=Zbtb 注册，可以获得0.4刀免费调用！

## 技术栈

- TypeScript
- Node.js
- 端脑云 API

## 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn
- Windows 或 MacOS 系统

### 安装依赖

```bash
# Windows/MacOS 通用命令
npm install
```

### 构建项目

```bash
# Windows/MacOS 通用命令
npm run build
```

### 开发模式

启动带有自动重新构建的开发模式：

```bash
# Windows/MacOS 通用命令
npm run watch
```

## Cline/ROO CODE 插件配置说明

在 Cline/ROO CODE 插件中，需要配置 MCP 服务器的启动命令。请按照以下步骤进行配置：


配置内容示例：

Windows:
```json
{
  "mcpServers": {
    "genimg-mcp": {
      "command": "node",
      "arg": ["C:\\path\\to\\genimg-mcp\\dist\\index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-xxxxx",
        "OPENAI_MODEL_ID": "dall-e-3"  # 可选
      }
    }
  }
}
```

MacOS:
```json
{
  "mcpServers": {
    "genimg-mcp": {
      "command": "/path/to/genimg-mcp/dist/index.js",
      "env": {
        "OPENAI_API_KEY": "sk-xxxxx",
        "OPENAI_MODEL_ID": "dall-e-3"  # 可选
      }
    }
  }
}
```
注意：
- Windows 路径使用双反斜杠 `\\` 或单正斜杠 `/`
- MacOS 路径使用单正斜杠 `/`
- 请确保路径指向实际安装位置

## 调试指南

由于 MCP 服务器通过标准输入输出（stdio）通信，调试可能会比较困难。我们推荐使用 [MCP Inspector](https://github.com/modelcontextprotocol/inspector) 工具：

```bash
# Windows/MacOS 通用命令
npm run inspector
```

Inspector 将提供一个浏览器访问地址，用于访问调试工具。

## 联系方式

如需支持，请联系1813345945@qq.com。

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](./LICENSE) 文件。