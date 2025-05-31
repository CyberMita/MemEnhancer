// The main script for the extension
// The following are examples of some basic extension functionality

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

//You'll likely need to import some other functions from the main script
import { saveSettingsDebounced } from "../../../../script.js";

// Keep track of where your extension is located, name should match repo name
const extensionName = "MemEnhancer"; // Updated extension name
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName]; // This will be initialized in loadSettings
const defaultSettings = {
    apiUrl: "",
    modelName: "",
    apiKey: "",
    // example_setting: false, // We can remove or keep this if needed for other purposes
};


 
// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
  //Create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // Updating settings in the UI
  // $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input"); // Remove or adapt
  $("#memenhancer_api_url").val(extension_settings[extensionName].apiUrl);
  $("#memenhancer_model_name").val(extension_settings[extensionName].modelName);
  $("#memenhancer_api_key").val(extension_settings[extensionName].apiKey);
}

// This function is called when the extension settings are changed in the UI
/* // Remove or adapt original event handlers
function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

// This function is called when the button is clicked
function onButtonClick() {
  // You can do whatever you want here
  // Let's make a popup appear with the checked setting
  toastr.info(
    `The checkbox is ${extension_settings[extensionName].example_setting ? "checked" : "not checked"}`,
    "A popup appeared because you clicked the button!"
  );
}
*/

// New input handlers for MemEnhancer settings
function onApiUrlInput(event) {
    extension_settings[extensionName].apiUrl = $(event.target).val();
    saveSettingsDebounced();
}

function onModelNameInput(event) {
    extension_settings[extensionName].modelName = $(event.target).val();
    saveSettingsDebounced();
}

function onApiKeyInput(event) {
    extension_settings[extensionName].apiKey = $(event.target).val();
    saveSettingsDebounced();
}

// This function is called when the extension is loaded
jQuery(async () => {
  // This is an example of loading HTML from a file
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);

  // Append settingsHtml to extensions_settings
  // extension_settings and extensions_settings2 are the left and right columns of the settings menu
  // Left should be extensions that deal with system functions and right should be visual/UI related 
  $("#extensions_settings").append(settingsHtml);

  // These are examples of listening for events
  // $("#my_button").on("click", onButtonClick); // Remove or adapt
  // $("#example_setting").on("input", onExampleInput); // Remove or adapt

  // Add event listeners for new MemEnhancer settings
  $("#memenhancer_api_url").on("input", onApiUrlInput);
  $("#memenhancer_model_name").on("input", onModelNameInput);
  $("#memenhancer_api_key").on("input", onApiKeyInput);

  // Load settings when starting things up (if you have any)
  loadSettings();
});
