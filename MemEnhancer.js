// The main script for the MemEnhancer extension

// Import required modules from SillyTavern
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// OpenAI and file system imports
import { OpenAI } from "openai";
import { promises as fs } from "fs";
import path from "path";

// Keep track of where your extension is located
const extensionName = "MemEnhancer";
const extensionFolderPath = `./${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
  apiKey: "",
  apiBaseUrl: "https://api.openai.com/v1"
};

// 存储上下文数据
let contextData = [];
let openaiClient = null;

// 加载设置
async function loadSettings() {
  // 创建设置（如果不存在）
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  
  // 更新UI中的设置
  $("#apiKey").val(extension_settings[extensionName].apiKey);
  $("#apiBaseUrl").val(extension_settings[extensionName].apiBaseUrl || defaultSettings.apiBaseUrl);
}

// 当设置更改时调用此函数
function onSettingsInput(event) {
  const id = $(event.target).attr("id");
  const value = $(event.target).val();
  extension_settings[extensionName][id] = value;
  saveSettingsDebounced();
}

// 保存设置按钮点击事件
function onSaveSettingsClick() {
  const apiKey = $("#apiKey").val();
  const apiBaseUrl = $("#apiBaseUrl").val();
  
  // 验证API Key
  if (!apiKey) {
    $("#apiKeyError").text("API Key不能为空");
    return;
  }
  
  // 保存设置
  extension_settings[extensionName].apiKey = apiKey;
  extension_settings[extensionName].apiBaseUrl = apiBaseUrl;
  saveSettingsDebounced();
  
  // 初始化OpenAI客户端
  initOpenAI();
  
  toastr.success("设置已保存", extensionName);
}

// 初始化OpenAI客户端
async function initOpenAI() {
  try {
    const { apiKey, apiBaseUrl } = extension_settings[extensionName];
    openaiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: apiBaseUrl
    });
  } catch (error) {
    console.error(`[${extensionName}] 初始化OpenAI客户端失败:`, error);
  }
}

// 加载JSON数据
async function loadContextData() {
  try {
    const dataPath = path.join(extensionFolderPath, 'data.json');
    const dataBuffer = await fs.readFile(dataPath);
    contextData = JSON.parse(dataBuffer.toString());
    console.log(`[${extensionName}] 加载到 ${contextData.length} 条上下文数据`);
  } catch (error) {
    console.error(`[${extensionName}] 加载数据失败:`, error);
    contextData = [];
  }
}

// 消息处理函数
async function processPrompt(text) {
  try {
    if (!openaiClient || contextData.length === 0) {
      return text;
    }
    
    // 步骤1：使用OpenAI提取关键词
    const aiResponse = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: '提取用户输入中的场景、人物、物品关键词，用JSON数组返回，如["教室","老师","课本"]'
      }, {
        role: 'user',
        content: text
      }]
    });
    const keywords = JSON.parse(aiResponse.choices[0].message.content);

    // 步骤2：搜索JSON文件
    const matchedDocs = contextData.filter(item => 
      keywords.some(kw => item.keywords.includes(kw))
    );

    // 步骤3：整合上下文
    const contextContent = matchedDocs.map(doc => `[知识库] ${doc.content}`).join('\n');
    return `${contextContent}\n用户输入：${text}`;
  } catch (error) {
    console.error(`[${extensionName}] 处理失败:`, error);
    return text;  // 保持原输入避免中断
  }
}

// 添加增强按钮到UI
function addEnhanceButton() {
  // 创建增强按钮
  const enhanceButton = document.createElement('button');
  enhanceButton.id = 'mem-enhance-button';
  enhanceButton.className = 'menu_button';
  enhanceButton.innerHTML = '<i class="fa fa-brain"></i> 增强记忆';
  enhanceButton.title = '使用AI提取关键词并增强对话上下文';
  
  // 添加按钮到SillyTavern界面
  // 注意：这里需要根据SillyTavern的实际DOM结构调整
  const targetContainer = document.querySelector('#send_form, .send_form');
  if (targetContainer) {
    targetContainer.appendChild(enhanceButton);
  }
  
  // 添加点击事件
  enhanceButton.addEventListener('click', async () => {
    // 获取输入框
    const inputElement = document.querySelector('#send_textarea, .send_textarea');
    if (!inputElement) return;
    
    const originalText = inputElement.value;
    if (!originalText.trim()) return;
    
    // 显示处理中状态
    enhanceButton.disabled = true;
    enhanceButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 处理中...';
    
    try {
      // 处理文本
      const enhancedText = await processPrompt(originalText);
      
      // 更新输入框
      inputElement.value = enhancedText;
      
      // 触发输入事件以更新UI
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      toastr.success('上下文已增强', extensionName);
    } catch (error) {
      console.error(`[${extensionName}] 增强失败:`, error);
      toastr.error('增强失败: ' + error.message, extensionName);
    } finally {
      // 恢复按钮状态
      enhanceButton.disabled = false;
      enhanceButton.innerHTML = '<i class="fa fa-brain"></i> 增强记忆';
    }
  });
}

// 插件初始化函数
jQuery(async () => {
  // 加载HTML设置界面
  const settingsHtml = `
    <div id="${extensionName}_settings" class="mem-enhancer-settings">
      <h3>MemEnhancer 设置</h3>
      <div class="setting-item">
        <label for="apiKey">API Key:</label>
        <input type="password" id="apiKey" placeholder="输入API密钥">
        <div class="error" id="apiKeyError"></div>
      </div>
      <div class="setting-item">
        <label for="apiBaseUrl">API 地址:</label>
        <input type="text" id="apiBaseUrl" placeholder="输入API地址" value="https://api.openai.com/v1">
      </div>
      <button id="saveSettings">保存设置</button>
    </div>
  `;

  // 添加设置到扩展设置面板
  $("#extensions_settings").append(settingsHtml);

  // 添加事件监听器
  $("#apiKey").on("input", onSettingsInput);
  $("#apiBaseUrl").on("input", onSettingsInput);
  $("#saveSettings").on("click", onSaveSettingsClick);

  // 加载设置和数据
  await loadSettings();
  await loadContextData();
  await initOpenAI();
  
  // 添加增强按钮到UI
  addEnhanceButton();
  const settingsHtmlFromFile = await $.get("./MemEnhancer.html");
$("#extensions_settings").append(settingsHtml);
  console.log(`[${extensionName}] 初始化完成`);
});