// MemEnhancer.js
const { OpenAI } = require('openai');
const fs = require('fs/promises');
const path = require('path');

module.exports = {
  name: 'MemEnhancer',
  author: 'CyberMita',
  version: '1.0.0',
  description: '通过AI提取关键词并结合本地JSON文件增强对话上下文',
  
  // 初始化时注册设置并读取JSON文件
  async init(app, register) {
    try {
      // 注册设置项
      register.settings({
        id: 'MemEnhancer',
        label: 'MemEnhancer 设置',
        settings: [
          {
            id: 'apiKey',
            type: 'string',
            label: 'AI API Key',
            placeholder: '输入你的AI服务API密钥（如OpenAI Key）',
            required: true
          },
          {
            id: 'apiBaseUrl',
            type: 'string',
            label: 'AI API 地址',
            placeholder: '输入兼容OpenAI的API基础地址',
            default: 'https://api.openai.com/v1'
          }
        ]
      });
      
      // 读取插件配置（使用register获取用户设置值）
      const settings = await app.getSettings('MemEnhancer');
      const { apiKey, apiBaseUrl } = settings;
      
      // 读取JSON数据
      const dataPath = path.join(__dirname, 'data.json');
      const dataBuffer = await fs.readFile(dataPath);
      this.contextData = JSON.parse(dataBuffer.toString());

      // 初始化OpenAI客户端
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: apiBaseUrl
      });

      app.log(`[${this.name}] 初始化完成，加载到 ${this.contextData.length} 条上下文数据`);
    } catch (error) {
      app.log.error(`[${this.name}] 初始化失败: ${error.message}`);
    }
  },

  // 消息预处理钩子
  async prePrompt({ prompt, user }) {
    try {
      // 步骤1：使用OpenAI提取关键词
      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: '提取用户输入中的场景、人物、物品关键词，用JSON数组返回，如["教室","老师","课本"]'
        }, {
          role: 'user',
          content: prompt.text
        }]
      });
      const keywords = JSON.parse(aiResponse.choices[0].message.content);

      // 步骤2：搜索JSON文件
      const matchedDocs = this.contextData.filter(item => 
        keywords.some(kw => item.keywords.includes(kw))
      );

      // 步骤3：整合上下文
      const contextContent = matchedDocs.map(doc => `[知识库] ${doc.content}`).join('\n');
      prompt.text = `${contextContent}\n用户输入：${prompt.text}`;

      return { prompt };
    } catch (error) {
      app.log.error(`[${this.name}] 处理失败: ${error.message}`);
      return { prompt };  // 保持原输入避免中断
    }
  }
};