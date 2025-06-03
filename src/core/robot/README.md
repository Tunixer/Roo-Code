# Robot State Management Architecture

这个模块提供了一个完整的机器人状态管理架构，用于处理机器人臂状态订阅、命令处理和与前端的通信。

## 架构概述

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   ClineProvider  │    │ RobotStateManager│
│ (arm_state.tsx) │◄──►│                  │◄──►│                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ArmStateSubscriber│
                                               │   (libzmq)      │
                                               └─────────────────┘
```

## 文件结构

- `types.ts` - 机器人相关的类型定义
- `ArmStateSubscriber.ts` - libzmq 订阅处理器
- `RobotStateManager.ts` - 主要的机器人状态管理器
- `README.md` - 本文档

## 主要组件

### 1. RobotStateManager

主要的状态管理器，负责：

- 初始化和管理 ArmStateSubscriber
- 处理来自前端的机器人命令
- 转发状态更新到 webview
- 执行机器人控制命令

### 2. ArmStateSubscriber

libzmq 订阅处理器，负责：

- 连接到 ZMQ 端点
- 订阅机器人状态消息
- 处理连接重试
- 发送状态更新事件

### 3. 类型定义

- `RobotPose` - 机器人位置和姿态
- `RobotArmState` - 完整的机器人臂状态
- `RobotCommandMessage` - 机器人命令消息
- `RobotStateUpdate` - 状态更新消息

## 使用方法

### 前端发送命令

```typescript
// 发送机器人命令
vscode.postMessage({
	type: "robotCommand",
	command: "enable",
	data: {
		/* 可选的命令数据 */
	},
})

// 请求当前机器人状态
vscode.postMessage({
	type: "requestRobotState",
})
```

### 前端接收状态更新

```typescript
// 监听状态更新
window.addEventListener("message", (event) => {
	const message = event.data
	if (message.type === "robotStateUpdate") {
		const armState = message.data.data
		// 更新 UI 状态
	}
})
```

### 支持的命令

- `enable` - 启用机器人臂
- `disable` - 禁用机器人臂
- `home` - 移动到原点位置
- `move_to_target` - 移动到目标位置
- `stop` - 停止运动
- `emergency_stop` - 急停
- `reset` - 重置机器人
- `save_home_position` - 保存原点位置
- `reset_home_position` - 重置原点位置

## 配置

### ZMQ 连接配置

默认配置：

- 端点: `tcp://localhost:5555`
- 主题: `arm_state`

可以在 `RobotStateManager` 构造函数中自定义：

```typescript
const robotStateManager = new RobotStateManager(
	provider,
	"tcp://192.168.1.100:5555", // 自定义端点
	"custom_topic", // 自定义主题
)
```

## 实际 libzmq 实现

当前使用模拟数据进行测试。要使用真实的 libzmq 连接，需要：

1. 安装 zeromq 库：

```bash
npm install zeromq
```

2. 在 `ArmStateSubscriber.ts` 中启用注释的真实实现代码

3. 根据你的机器人控制器 API 实现 `RobotStateManager` 中的控制命令方法

## 错误处理

系统包含完整的错误处理机制：

- 连接失败自动重试
- 错误消息转发到前端
- 优雅的资源清理

## 扩展

要添加新的机器人功能：

1. 在 `types.ts` 中添加新的类型定义
2. 在 `RobotStateManager` 中添加新的命令处理
3. 在 `webviewMessageHandler.ts` 中添加新的消息类型
4. 更新前端组件以支持新功能

feat(robot): Add comprehensive robot state management architecture

- Add robot types and interfaces in src/core/robot/types.ts
- Implement ArmStateSubscriber for libzmq state subscription with auto-reconnect
- Create RobotStateManager for centralized robot command handling and state management
- Integrate robot state manager into ClineProvider with lifecycle management
- Add robot message handling in webviewMessageHandler for robotCommand and requestRobotState
- Update WebviewMessage and ExtensionMessage types to support robot communication
- Include comprehensive documentation and usage examples
- Support 9 robot control commands (enable, disable, home, move_to_target, etc.)
- Provide mock data stream for development and testing
- Include real libzmq implementation examples for production use
